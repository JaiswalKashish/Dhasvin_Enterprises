# File Upload Testing & Debugging Guide

## Changes Made to Fix Preview Issues

### 1. **Better File Type Detection**
- Separated extension-based detection from mimetype detection
- More precise logic for determining which parser to try first

### 2. **Preview Doesn't Fail on Missing Columns**
- Preview now shows warnings instead of blocking when required columns are missing
- Only the final import step fails if columns are actually missing

### 3. **Better Error Handling**
- Added validation for rows with parsing errors
- Skip rows with errors instead of stopping entire upload
- Improved error messages

### 4. **Detailed Server Logging**
- File upload details logged
- Parser attempts logged
- Success/failure logged with row counts

---

## How to Test

### Step 1: Start the Application
```bash
cd "C:\Users\kashi\Desktop\ai_project\Data-Analytics-Inventory"
pnpm dev
```

### Step 2: Test with Sample Files

#### Option A: Test with Excel File
1. Create a simple Excel file with these columns:
   - Product Name
   - Quantity
   - Price
   
2. Add a few rows of data
3. Upload it from the File Upload page
4. Select "Purchases" section
5. Click "Preview File"

#### Option B: Test with CSV File  
1. Create `test.csv` with content:
```
Product Name,Quantity,Price
Widget A,10,100
Gadget B,5,250
Item C,20,50
```

2. Upload this file
3. Check if preview shows the data

#### Option C: Test with PDF
1. Use any PDF invoice
2. Upload it
3. Check if preview extracts product information

---

## Expected Behavior

### ✅ Good Preview:
- Shows "Preview parsed X rows"
- Displays detected format (PDF, Excel/CSV, or fallback)
- Shows 10 sample rows in a table
- Displays any warnings/errors
- "Confirm & Import" button enabled

### ❌ Bad Preview (What Might Still Be Wrong):
- "Preview failed" error
- No rows displayed
- Error messages in preview panel

---

## Debugging Steps

### 1. **Check Browser Console**
- Press F12 in browser
- Go to "Console" tab
- Upload file and look for errors
- Copy/paste any errors

### 2. **Check Server Logs**
- Look at terminal where API server is running
- Should see logs like:
```
Upload request received
  hasFile: true
  fileSize: 12345
  originalName: test.xlsx
  mimeType: application/vnd.ms-excel
  section: purchases
  isPreview: true

Processing file
  filename: test.xlsx
  mimetype: application/vnd.ms-excel
  bufferSize: 12345

File type detection
  hasPdfExtension: false
  isPdfMimetype: false
  hasExcelExtension: true
  isExcelMimetype: true
  isPdf: false
  isExcel: true

Attempting Excel parsing

Excel parsed successfully
  rowsCount: 3
```

### 3. **Common Issues & Solutions**

| Issue | Possible Cause | Solution |
|-------|---|---|
| "Preview failed" (no details) | Network error | Check browser network tab |
| File not uploading | File too large | Ensure < 10MB |
| Wrong format detected | Corrupted file headers | Try different file |
| No rows in preview | Empty file | Add data rows to file |
| Missing columns error | Wrong column names | Check column headers |

---

## Quick Test Files

Create these in `C:\Users\kashi\Desktop\ai_project\Data-Analytics-Inventory\`:

### test.xlsx (via Excel or LibreOffice):
| Product Name | Quantity | Price | Supplier |
|---|---|---|---|
| Laptop | 5 | 50000 | Dell Inc |
| Mouse | 50 | 500 | Logitech |
| Keyboard | 30 | 1500 | Corsair |

### test.csv:
```
Product Name,Quantity,Price,Supplier
Laptop,5,50000,Dell Inc
Mouse,50,500,Logitech
Keyboard,30,1500,Corsair
```

---

## Expected Logs When Everything Works

```
Upload request received {
  hasFile: true,
  fileSize: 5234,
  originalName: "test.xlsx",
  mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  section: "purchases",
  isPreview: true
}

Processing file {
  filename: "test.xlsx",
  mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  bufferSize: 5234
}

File type detection {
  hasPdfExtension: false,
  isPdfMimetype: false,
  hasExcelExtension: true,
  isExcelMimetype: true,
  isPdf: false,
  isExcel: true
}

Attempting Excel parsing

Excel parsed successfully {
  rowsCount: 3
}
```

---

## Next Steps If Still Failing

1. **Share the error message** from browser console
2. **Share the server logs** when uploading
3. **Share the file you're trying** to upload (if possible)
4. Check if APIserver is actually running
5. Verify network requests in browser DevTools

---

## Feature Status
- ✅ File upload with fallback parsing
- ✅ Detection of PDF, Excel, CSV
- ✅ Graceful error handling
- ⚠️ **TESTING NEEDED** - Preview and upload workflow
- ⚠️ **TESTING NEEDED** - Actual data import

Successfully Fixed:
- PDF parser validation
- Excel/CSV parser robustness
- Error messages are user-friendly
- Bidirectional fallback works
- Code compiles without errors

Please test with actual files and share any errors encountered!
