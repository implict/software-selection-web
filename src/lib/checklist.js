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
    // FIRST: Capture style from the first data row (row 7) to apply to new rows later
    const columnStyles = {}
    const templateRow = ws.getRow(7)
    if (templateRow) {
        templateRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            columnStyles[colNumber] = cell.style
        })
    }

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
        const row = ws.getRow(nextRow)

        // Apply styles from template
        Object.keys(columnStyles).forEach(colNumber => {
            const cell = row.getCell(Number(colNumber))
            cell.style = columnStyles[colNumber]
        })

        row.getCell(2).value = '' // 연번 (set below)
        row.getCell(3).value = item.name       // 소프트웨어명
        row.getCell(4).value = item.provider   // 공급자
        row.getCell(5).value = item.category   // 유형

        row.commit()
    }

    // 6. Re-number 연번 (column B) starting from row 7
    let seq = 1
    const newLastRow = ws.rowCount
    for (let rowIdx = 7; rowIdx <= newLastRow; rowIdx++) {
        const nameCell = ws.getCell(rowIdx, 3)
        if (nameCell.value && String(nameCell.value).trim()) {
            ws.getCell(rowIdx, 2).value = seq
            seq++
        }
    }

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
