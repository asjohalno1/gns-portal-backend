const XLSX = require("xlsx");
const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY);

// Constants
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const ACA_THRESHOLD_PERCENT = 0.0839; // 8.39%

// Utility functions
const safeDate = (dateStr) => {
  const d = fromExcelSerial(dateStr);
  return isNaN(d.getTime()) ? null : d;
};

const fromExcelSerial = (serial) => {
  const baseDate = new Date(Date.UTC(1899, 11, 30));
  return new Date(baseDate.getTime() + serial * 86400000);
};

const isEmployedInMonth = (hireDate, termDate, monthIndex) => {
  const year = new Date().getFullYear() - 1;
  const monthStart = new Date(year, monthIndex, 1);
  const monthEnd = new Date(year, monthIndex + 1, 0);

  return (
    (!hireDate || hireDate <= monthEnd) && (!termDate || termDate >= monthStart)
  );
};

const isAffordable = (mecRate, w2Wages) => {
  const monthlyThreshold = (w2Wages * ACA_THRESHOLD_PERCENT) / 12;
  return mecRate <= monthlyThreshold;
};

// Generate 1095C data for an employee
const generate1095CData = ({
  hireDate,
  termDate,
  w2Wages,
  mecRates = {},
}) => {
  const parsedHire = hireDate ? safeDate(hireDate) : null;
  const parsedTerm = termDate ? safeDate(termDate) : null;
  const wages = parseFloat(w2Wages) || 0;

  const result = {
    line14: {},
    line15: {},
    line16: {},
  };

  MONTHS.forEach((month, i) => {
    const active = isEmployedInMonth(parsedHire, parsedTerm, i);
    const mec = parseFloat(mecRates * 0.5) || 0;

    // Line 14: Offer of Coverage
    result.line14[month] = active ? "1E" : "1H";

    // Line 15: Required Employee Contribution
    result.line15[month] = active ? mec : "";

    // Line 16: Safe Harbor
    if (!active) {
      result.line16[month] = "2A";
    } else if (isAffordable(mec, wages)) {
      result.line16[month] = "2F";
    } else {
      result.line16[month] = "";
    }
  });

  return result;
};

// Map columns using Gemini AI
const mapColumnsWithGemini = async (headers) => {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `
You are helping automate IRS Form 1095-C preparation.

Given the following raw Excel column headers:
[${headers.join(", ")}]

Map them to these internal system field keys:
- employeeFirstName
- employeeMiddleName
- employeeLastName
- employeeSuffix
- email
- ssn
- addressLine1
- addressLine2
- city
- state
- zip
- country
- employerPhone
- planStartMonth
- coverageOfferCode
- hireDate
- terminationDate
- employeeContribution
- w2Wages
- dob
- age
- weeksWorked
- monthsWorked

Please respond in JSON format like:
{
  "employeeFirstName": "First name",
  "employeeMiddleName": "Middle name",
  "ssn": "Social security number (SSN)",
  "hireDate": "Hire Date",
  ...
}

Only return valid JSON. Do not include any explanation.
`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Extract and parse the first valid JSON block from Gemini's response
    const jsonMatch = text.match(/{[\s\S]*}/);
    if (!jsonMatch) throw new Error("Invalid Gemini output format");

    const mapping = JSON.parse(jsonMatch[0]);
    return mapping;
  } catch (err) {
    console.error("❌ Error mapping columns with Gemini:", err.message);
    throw new Error("Gemini column mapping failed");
  }
};

// Extract MEC rates from Cal Choice file
const extractMecRates = async (rateSheetJson) => {
  let planAdminNameRowIndex = -1;
  for (let i = 0; i < rateSheetJson.length; i++) {
    if (rateSheetJson[i] && rateSheetJson[i][0] === "Plan Admin Name") {
      planAdminNameRowIndex = i;
      break;
    }
  }
  if (planAdminNameRowIndex === -1) {
    throw new Error("Could not find 'Plan Admin Name' row.");
  }

  const planAdminNames = rateSheetJson[planAdminNameRowIndex];
  let targetColumnIndex = -1;
  const targetPlanName = "2024 CalChoice Kaiser Permanente Bronze HMO C";

  for (let i = 0; i < planAdminNames.length; i++) {
    if (
      planAdminNames[i] &&
      String(planAdminNames[i]).includes(targetPlanName)
    ) {
      targetColumnIndex = i;
      break;
    }
  }
  if (targetColumnIndex === -1) {
    throw new Error(`Could not find plan "${targetPlanName}" in the headers.`);
  }

  const premiums = {};

  let startDataRowIndex = -1;
  for (let i = 0; i < rateSheetJson.length; i++) {
    if (rateSheetJson[i] && String(rateSheetJson[i][0]).includes("Age 0-14")) {
      startDataRowIndex = i;
      break;
    }
  }
  if (startDataRowIndex === -1) {
    throw new Error("Could not find starting age data row (e.g., 'Age 0-14').");
  }

  for (let age = 15; age <= 99; age++) {
    const ageRow = rateSheetJson.find(
      (row) => row && String(row[0]).includes(`Age ${age}`)
    );

    if (ageRow) {
      const premium = ageRow[targetColumnIndex];
      if (premium !== undefined && premium !== null && premium !== "") {
        premiums[age] = parseFloat(premium);
      } else {
        console.warn(`Warning: Premium for Age ${age} is missing or empty.`);
      }
    } else {
      console.warn(`Warning: Data for Age ${age} not found in the sheet.`);
    }
  }

  return premiums;
};

// Generate Excel file
const generateExcel = async (employees, adpFileName = null, customFilename = null) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("1095C Final");

  // Define headers with styles
  const baseHeaders = [
    "Employee first name",
    "Middle name",
    "Last name",
    "Suffix",
    "Email",
    "Social security number (SSN)",
    "Street address",
    "Street address 2",
    "City or town",
    "State or province",
    "Country code",
    "Zip or foreign postal code",
    "Employer contact phone number",
    "Plan start month",
    "14. Offer of coverage (enter required code)",
    "Hire Date",
    "Termination date",
  ];

  const line14Headers = MONTHS.map((m) => `14. ${m}`);
  const line15Headers = [
    "15.Employee required contribution - All 12 Months",
    ...MONTHS.map((m) => `15. ${m}`),
  ];
  const line16Headers = [
    "16. Applicable section 4980H safe harbor (enter code if applicable) - All 12 Months",
    ...MONTHS.map((m) => `16. ${m}`),
  ];
  const footerHeaders = [
    "W-2",
    "DOB",
    "Age",
    "No. of weeks worked",
    "No. of months worked",
  ];

  const headers = [
    ...baseHeaders,
    ...line14Headers,
    ...line15Headers,
    ...line16Headers,
    ...footerHeaders,
  ];

  worksheet.addRow(headers);

  worksheet.getRow(1).eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "BFEFFF" },
    };
    cell.font = {
      name: "Times New Roman",
      size: 10,
      bold: true,
      color: { argb: "FF1F4E78" },
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });
  worksheet.getRow(1).height = 57;
  worksheet.autoFilter = {
    from: {
      row: 1,
      column: 1,
    },
    to: {
      row: 1,
      column: headers.length,
    },
  };

  for (const emp of employees) {
    const row = [
      emp.employeeFirstName,
      emp.middleName,
      emp.lastName,
      "",
      emp.email,
      emp.ssn,
      emp.address1,
      emp.address2,
      emp.city,
      emp.state,
      emp.country,
      emp.zip,
      emp.phone,
      emp.planStartMonth || "01",
      emp.offerCode || "",
      emp.hireDate,
      emp.termDate,
      ...MONTHS.map((m) => emp.line14?.[m] || ""),
      "",
      ...MONTHS.map((m) => emp.line15?.[m] || ""),
      "",
      ...MONTHS.map((m) => emp.line16?.[m] || ""),
      emp.w2Wages,
      emp.dob,
      Number(emp.age),
      emp.weeksWorked,
      emp.monthsWorked,
    ];
    worksheet.addRow(row);
  }

  // Auto width
  worksheet.columns.forEach((col) => {
    let maxLength = 12;
    col.eachCell({ includeEmpty: true }, (cell, rowNumber) => {
      const val =
        cell.value instanceof Date
          ? cell.value.toLocaleDateString()
          : cell.value || "";
      maxLength = Math.max(maxLength, val.toString().length);
      if (rowNumber !== 1) {
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.font = {
          name: "Times New Roman",
          size: 10,
        };
      }
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
    col.width = maxLength + 2;
  });

  // Add Data type to col
  const hireDateCol = worksheet.getColumn(headers.indexOf("Hire Date") + 1);
  const termDateCol = worksheet.getColumn(
    headers.indexOf("Termination date") + 1
  );
  const dobCol = worksheet.getColumn(headers.indexOf("DOB") + 1);

  [hireDateCol, termDateCol, dobCol].forEach((col) => {
    col.numFmt = "dd-mm-yyyy";
  });

  const startIdx =
    headers.indexOf("15.Employee required contribution - All 12 Months") + 1;
  const endIdx = startIdx + 12;
  for (let i = startIdx; i <= endIdx; i++) {
    worksheet.getColumn(i).numFmt =
      '_ "$" * #,##0.00_ ;_ "$" * -#,##0.00_ ;_ "$" * "-"??_ ;_ @_ ';
  }

  await add1094CSheet(workbook, employees);

  // Save Excel
  let filename;
  if (adpFileName) {
    // Extract the base name without extension from ADP file
    const adpBaseName = path.parse(adpFileName).name;
    filename = customFilename || `ESRP-${adpBaseName}.xlsx`;
  } else {
    // Fallback to timestamp if no ADP filename provided
    const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "");
    filename = customFilename || `1095C_Final_${timestamp}.xlsx`;
  }
  const outputPath = path.join("api/uploads", filename);
  if (!fs.existsSync("api/uploads")) fs.mkdirSync("api/uploads", { recursive: true });
  await workbook.xlsx.writeFile(outputPath);

  console.log("outputPath: ", outputPath);
  return filename;
};

// Add 1094C sheet
const add1094CSheet = async (workbook, employees) => {
  const sheet = workbook.addWorksheet("1094C");

  const header1 = [
    "18. Total number of Forms 1095-C submitted with this transmittal",
    "19. Is this the authoritative transmittal for this ALE Member?",
    "20. Total number of Forms 1095-C filed by and/or on behalf of ALE Member.",
    "21. Is ALE Member a member of an Aggregated ALE Group?",
    "22. Certifications of Eligibility",
  ];

  const header2 = [
    "23. All 12 Months",
    "24. Jan",
    "25. Feb",
    "26. Mar",
    "27. Apr",
    "28. May",
    "29. June",
    "30. July",
    "31. Aug",
    "32. Sept",
    "33. Oct",
    "34. Nov",
    "35. Dec",
  ];
  const subHeaders = [
    "(a) Minimum Essential Coverage Offer Indicator",
    "(b) Section 4980H Full-Time Employee Count",
    "(c) Total Employee Count",
    "(d) Aggregated Group Indicator",
  ];
  // ROW 1
  const row1 = [...header1, ...header2.flatMap(() => ["", "", "", ""])];
  sheet.addRow(row1);

  let colIndex = header1.length + 1;
  for (const month of header2) {
    sheet.mergeCells(1, colIndex, 1, colIndex + 3);
    sheet.getCell(1, colIndex).value = month;
    sheet.getCell(1, colIndex).alignment = {
      horizontal: "center",
      vertical: "middle",
    };
    colIndex += 4;
  }

  // ROW 2
  sheet.addRow([
    ...Array(header1.length).fill(""),
    ...header2.flatMap(() => subHeaders),
  ]);

  [1, 2].forEach((rowNum) => {
    sheet.getRow(rowNum).eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "BFEFFF" },
      };
      cell.font = {
        name: "Times New Roman",
        size: 10,
        bold: true,
        color: { argb: "FF1F4E78" },
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: "center",
        wrapText: true,
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
    sheet.getRow(rowNum).height = 65;
  });

  // ROW 3
  const monthlyEmployeeCounts = getMonthlyEmployeeCountsFromDates(employees);
  const monthKeys = [
    "Jan", "Feb", "Mar", "Apr", "May", "June",
    "July", "Aug", "Sept", "Oct", "Nov", "Dec"
  ];

  const row3 = [
    employees.length,
    "yes",
    employees.length,
    "No",
    "D. 98% Offer Method",
    "",
    "",
    "",
    "",
    ...monthKeys.flatMap((month) => [
      "Yes",
      "",
      monthlyEmployeeCounts[month] || "",
      "",
    ]),
  ];

  sheet.addRow(row3);

  sheet.columns.forEach((col) => {
    col.width = 22;
    col.eachCell((cell, rowNumber) => {
      if (rowNumber > 2) {
        cell.font = {
          name: "Times New Roman",
          size: 10,
        };
        cell.alignment = {
          vertical: "middle",
          horizontal: "center",
        };
      }
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
  });
};

const getMonthlyEmployeeCountsFromDates = (employees, targetYear = 2024) => {
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "June",
    "July", "Aug", "Sept", "Oct", "Nov", "Dec"
  ];
  const counts = months.reduce((acc, m) => ({ ...acc, [m]: 0 }), {});

  for (const emp of employees) {
    const hireDate = emp.hireDate ? safeDate(emp.hireDate) : null;
    const termDate = emp.termDate ? safeDate(emp.termDate) : null;

    if (!hireDate) continue;

    for (let i = 0; i < 12; i++) {
      const monthStart = new Date(targetYear, i, 1);
      const monthEnd = new Date(targetYear, i + 1, 0);

      const isActive = (hireDate <= monthEnd) && (!termDate || termDate >= monthStart);
      if (isActive) {
        counts[months[i]]++;
      }
    }
  }

  return counts;
};

// Main ESRP processing function
const processESRPFiles = async (adpFile, calChoiceFile, customFilename) => {
  try {
    if (!adpFile) {
      throw new Error("No ADP file uploaded");
    }

    // Read file from disk since multer saves to disk storage
    const adpFilePath = adpFile.path;
    const workbook = XLSX.readFile(adpFilePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(sheet);
    const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const headers = json[0].map((header) => header?.toString().trim());

    let mecRatesByAge = {};
    if (calChoiceFile) {
      const calChoiceFilePath = calChoiceFile.path;
      const calChoiceWorkbook = XLSX.readFile(calChoiceFilePath);
      const calSheet =
        calChoiceWorkbook.Sheets[calChoiceWorkbook.SheetNames[0]];
      const calRates = XLSX.utils.sheet_to_json(calSheet, {
        header: 1,
        raw: true,
      });
      mecRatesByAge = await extractMecRates(calRates);
    } else if (workbook.SheetNames.includes("Benefits > Rates")) {
      const calSheet = workbook.Sheets["Benefits > Rates"];
      const calRates = XLSX.utils.sheet_to_json(calSheet, {
        header: 1,
        raw: true,
      });
      mecRatesByAge = await extractMecRates(calRates);
    }

    const columnMap = await mapColumnsWithGemini(headers);

    const employees = rawData.map((row) => {
      const hireDate = row[columnMap.hireDate];
      const termDate = row[columnMap.terminationDate];
      const w2Wages = row[columnMap.w2Wages];

      const age = Number(row[columnMap.age]);
      const mecRates = mecRatesByAge[age] || {};

      const rules = generate1095CData({
        hireDate,
        termDate,
        w2Wages,
        mecRates,
      });

      return {
        employeeFirstName: row[columnMap.employeeFirstName],
        middleName: row[columnMap.employeeMiddleName],
        lastName: row[columnMap.employeeLastName],
        email: row[columnMap.email],
        ssn: row[columnMap.ssn],
        address1: row[columnMap.addressLine1],
        address2: row[columnMap.addressLine2],
        city: row[columnMap.city],
        state: row[columnMap.state],
        country: row[columnMap.country],
        zip: row[columnMap.zip],
        phone: row[columnMap.employerPhone],
        planStartMonth: row[columnMap.planStartMonth],
        offerCode: row[columnMap.offerCode],
        hireDate,
        termDate,
        w2Wages,
        dob: row[columnMap.dob],
        age: row[columnMap.age],
        weeksWorked: row[columnMap.weeksWorked],
        monthsWorked: row[columnMap.monthsWorked],
        line14: rules.line14,
        line15: rules.line15,
        line16: rules.line16,
        fullData: row,
      };
    });

    const outputPath = await generateExcel(employees, adpFile.originalname, customFilename);
    return {
      success: true,
      filename: outputPath,
      message: "File processed successfully!",
      downloadUrl: `/api/esrp/download/${outputPath}`,
      employeeCount: employees.length
    };
  } catch (err) {
    console.error("❌ Error processing ESRP files:", err);
    throw new Error(`ESRP processing failed: ${err.message}`);
  }
};

module.exports = {
  processESRPFiles,
  generateExcel,
  mapColumnsWithGemini,
  extractMecRates,
  generate1095CData,
};
