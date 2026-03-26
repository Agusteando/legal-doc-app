// Enforces formal, professional legal document styling. 
// No colors, no informal fonts, no invented lines or boxes. Strict typography.
export function renderLayoutBlock(block: any): string {
  const align = block.alignment ? `text-align: ${block.alignment};` : 'text-align: left;';
  const content = block.translated_content || ''; 

  let html = '';
  switch (block.type) {
    case 'heading':
      html = `<h2 style="font-family: 'Times New Roman', Times, serif; font-size: 12pt; font-weight: bold; margin: 12pt 0; color: #000; text-transform: uppercase; ${align}">${content}</h2>`;
      break;
    case 'paragraph':
      html = `<p style="font-family: 'Times New Roman', Times, serif; font-size: 11pt; margin: 0 0 12pt 0; line-height: 1.5; color: #000; ${align}">${content}</p>`;
      break;
    case 'signature':
      html = `<p style="font-family: 'Times New Roman', Times, serif; font-size: 11pt; margin: 24pt 0 12pt 0; color: #000; ${align}">${content}</p>`;
      break;
    case 'stamp':
      html = `<p style="font-family: 'Times New Roman', Times, serif; font-size: 11pt; font-weight: bold; margin: 12pt 0; color: #000; ${align}">${content}</p>`;
      break;
    case 'handwritten_note':
      html = `<p style="font-family: 'Times New Roman', Times, serif; font-size: 11pt; font-style: italic; margin: 12pt 0; color: #000; ${align}">${content}</p>`;
      break;
    case 'divider':
      html = `<hr style="margin: 12pt 0; border: none; border-top: 1px solid #000;" />`;
      break;
    case 'form_field':
      html = `<p style="font-family: 'Times New Roman', Times, serif; font-size: 11pt; margin: 0 0 8pt 0; color: #000; ${align}"><strong>${block.form_label || ''}:</strong> ${block.form_value || ''}</p>`;
      break;
    case 'list':
      const listStyle = block.alignment === 'center' ? 'list-style-position: inside;' : '';
      html += `<ul style="margin: 0 0 12pt 0; padding-left: 24pt; color: #000; font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.5; list-style-type: disc; ${align} ${listStyle}">`;
      if (block.list_items && Array.isArray(block.list_items)) {
        block.list_items.forEach((item: string) => {
          html += `<li style="margin-bottom: 6pt;">${item}</li>`;
        });
      }
      html += `</ul>`;
      break;
    case 'table':
      if (block.table_data && Array.isArray(block.table_data)) {
        html += `<table style="width: 100%; border-collapse: collapse; margin: 12pt 0; font-family: 'Times New Roman', Times, serif; font-size: 11pt; color: #000; border: 1px solid #000;"><tbody>`;
        block.table_data.forEach((row: any, i: number) => {
          html += `<tr>`;
          if (Array.isArray(row)) {
            row.forEach((cell: any) => {
              const isHeaderRow = i === 0;
              const isEmptyHeader = isHeaderRow && row.every((c: string) => !c || !c.trim());
              const tag = isHeaderRow && !isEmptyHeader ? 'th' : 'td';
              const style = isHeaderRow && !isEmptyHeader
                ? 'border: 1px solid #000; padding: 4pt; font-weight: bold; text-align: left; vertical-align: top;'
                : 'border: 1px solid #000; padding: 4pt; text-align: left; vertical-align: top;';
              html += `<${tag} style="${style}">${cell}</${tag}>`;
            });
          }
          html += `</tr>`;
        });
        html += `</tbody></table>`;
      }
      break;
    default:
      html = `<p style="font-family: 'Times New Roman', Times, serif; font-size: 11pt; margin: 0 0 12pt 0; line-height: 1.5; color: #000; ${align}">${content}</p>`;
  }
  return html;
}