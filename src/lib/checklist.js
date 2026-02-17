import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

/**
 * Generate a filtered checklist Excel file from the template.
 * 
 * @param {Array} softwareMeta - Array of {name, provider, category} for selected software
 */
export async function downloadChecklist(softwareMeta) {
    // 1. Fetch the template from public/
    const response = await fetch('/checklist_template.xlsx')
    const arrayBuffer = await response.arrayBuffer()

    // 2. Load workbook
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(arrayBuffer)

    const ws = workbook.getWorksheet('필수기준+선택기준')
    if (!ws) {
        throw new Error('Worksheet "필수기준+선택기준" not found')
    }

    const swNameSet = new Set(softwareMeta.map(item => item.name))
    const foundNames = new Set()

    // 3. Identify data rows to delete (row 7 onwards)
    // Column C (3) = SW name
    const rowsToDelete = []
    const lastDataRow = ws.rowCount

    for (let rowIdx = 7; rowIdx <= lastDataRow; rowIdx++) {
        const cell = ws.getCell(rowIdx, 3)
        const cellValue = cell.text ? cell.text.trim() : (cell.value ? String(cell.value).trim() : '')

        // Fix: Ensure we only keep the FIRST instance of a software from the template
        // If it's in our list AND we haven't found it yet, keep it.
        // Otherwise (not in list, OR already found duplicate), delete it.
        if (swNameSet.has(cellValue) && !foundNames.has(cellValue)) {
            foundNames.add(cellValue)
        } else {
            rowsToDelete.push(rowIdx)
        }
    }

    // 4. Delete rows from bottom to top
    for (let i = rowsToDelete.length - 1; i >= 0; i--) {
        ws.spliceRows(rowsToDelete[i], 1)
    }

    // 5. Add missing software with basic info
    const missingItems = softwareMeta.filter(item => !foundNames.has(item.name))

    for (const item of missingItems) {
        const nextRow = ws.rowCount + 1
        ws.getCell(nextRow, 2).value = '' // 연번 (set below)
        ws.getCell(nextRow, 3).value = item.name       // 소프트웨어명
        ws.getCell(nextRow, 4).value = item.provider   // 공급자
        ws.getCell(nextRow, 5).value = item.category   // 유형
    }

    // 6. Re-number 연번 (column B) AND Apply Clean Styling to ALL Rows
    // We override the neon colors from the template with the clean Purple/Grey theme
    let seq = 1

    // Define Styles
    const borderStyle = { style: 'thin', color: { argb: 'FF000000' } }
    const borders = { top: borderStyle, left: borderStyle, bottom: borderStyle, right: borderStyle }
    const centerAlign = { vertical: 'middle', horizontal: 'center', wrapText: true }

    const purpleFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6A0DAD' } } // Row 1
    const lightPurpleFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1C4E9' } } // Row 2
    const greyFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } } // Row 3-6
    const whiteFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } } // Row 7+

    // Iterate all rows to clean up styles
    ws.getRow(1).height = 45 // Ensure Row 1 is tall enough for the title

    ws.eachRow((row, rowNumber) => {
        row.eachCell({ includeEmpty: true }, (cell) => {
            // Apply Borders & Alignment to everything
            cell.border = borders
            cell.alignment = centerAlign

            // Apply Background Colors based on Row Number
            if (rowNumber === 1) {
                cell.fill = purpleFill
                // Title: White, Bold, Larger
                cell.font = { name: 'Malgun Gothic', size: 24, bold: true, color: { argb: 'FFFFFFFF' } }
            } else if (rowNumber === 2) {
                cell.fill = lightPurpleFill
                // Description: Black, but URL should be Blue
                // Check if it's a hyperlink object or rich text
                if (cell.value && typeof cell.value === 'object') {
                    if (cell.value.richText) {
                        // Rich Text: Fix colors individually
                        cell.value.richText.forEach(part => {
                            if (part.text.includes('http') || part.text.includes('www.')) {
                                part.font = { name: 'Malgun Gothic', color: { argb: 'FF0000FF' }, underline: true, bold: true }
                            } else {
                                part.font = { name: 'Malgun Gothic', color: { argb: 'FF000000' }, bold: true }
                            }
                        })
                    } else if (cell.value.hyperlink) {
                        // Standard Hyperlink object
                        cell.font = { name: 'Malgun Gothic', color: { argb: 'FF0000FF' }, underline: true, bold: true }
                    }
                } else {
                    // Plain text: default to black
                    cell.font = { name: 'Malgun Gothic', color: { argb: 'FF000000' }, bold: true }
                }
            } else if (rowNumber >= 3 && rowNumber <= 6) {
                cell.fill = greyFill
                cell.font = { bold: true, name: 'Malgun Gothic', color: { argb: 'FF000000' } }
            } else if (rowNumber >= 7) {
                // Data Rows
                cell.fill = whiteFill
                cell.font = { name: 'Malgun Gothic', size: 10, color: { argb: 'FF000000' } }
            }
        })

        // Re-number logic for data rows
        if (rowNumber >= 7) {
            const nameCell = row.getCell(3)
            if (nameCell.value && String(nameCell.value).trim()) {
                row.getCell(2).value = seq
                seq++
            }
        }
    })

    // 7. Save and download
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    saveAs(blob, '학습지원_소프트웨어_선정기준_체크리스트.xlsx')

    return {
        total: foundNames.size + missingItems.length,
        matched: foundNames.size,
        added: missingItems.length
    }
}
