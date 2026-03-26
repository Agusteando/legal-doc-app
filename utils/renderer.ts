// Enforces formal, professional legal document styling. 
// No colors, no informal fonts, strict typography.
export function renderLayoutBlock(block: any): string {
  const align = block.alignment ? `text-align: ${block.alignment};` : 'text-align: left;';
  const content = block.translated_content || ''; 

  let html = '';
  switch (block.type) {
    case 'heading':
      html = `<h2 style="font-family: 'Times New Roman', Times, serif; font-size: 13pt; font-weight: bold; margin-top: 18pt; margin-bottom: 12pt; color: #000; text-transform: uppercase; letter-spacing: 0.02em; border-bottom: 1px solid #000; padding-bottom: 4pt; ${align}">${content}</h2>`;
      break;
    case 'paragraph':
      html = `<p style="font-family: 'Times New Roman', Times, serif; font-size: 11pt; margin-bottom: 12pt; line-height: 1.5; color: #000; ${align}">${content}</p>`;
      break;
    case 'signature':
      html = `<div style="margin: 30pt 0 15pt 0; padding-top: 6pt; border-top: 1px solid #000; width: 250px; font-family: 'Times New Roman', Times, serif; color: #000; ${align}">
                <span style="font-size: 11pt; font-weight: bold; display: block;">${content}</span>
              </div>`;
      break;
    case 'stamp':
      html = `<div style="margin: 15pt 0; padding: 10pt; border: 1px solid #000; color: #000; font-family: 'Times New Roman', Times, serif; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; display: inline-block; max-width: 350px; text-align: center; font-size: 10pt; ${align}">
                [STAMP / SEAL: ${content}]
              </div>`;
      break;
    case 'handwritten_note':
      html = `<div style="margin: 12pt 0; padding: 8pt; color: #000; font-family: 'Times New Roman', Times, serif; font-size: 11pt; font-style: italic; border-left: 2px solid #000; ${align}">
                [Handwritten Note: ${content}]
              </div>`;
      break;
    case 'divider':
      html = `<hr style="margin: 20pt 0; border: none; border-top: 1px solid #000;" />`;
      break;
    case 'form_field':
      html = `<div style="margin-bottom: 8pt; display: flex; align-items: baseline; font-family: 'Times New Roman', Times, serif; font-size: 11pt; color: #000;">
                <span style="font-weight: bold; margin-right: 8pt;">${block.form_label || ''}:</span>
                <span style="flex-grow: 1; border-bottom: 1px dotted #000; padding-bottom: 2pt;">${block.form_value || ''}</span>
              </div>`;
      break;
    case 'list':
      const listStyle = block.alignment === 'center' ? 'list-style-position: inside;' : '';
      html += `<ul style="margin: 12pt 0; padding-left: 24pt; color: #000; font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.5; list-style-type: disc; ${align} ${listStyle}">`;
      if (block.list_items && Array.isArray(block.list_items)) {
        block.list_items.forEach((item: string) => {
          html += `<li style="margin-bottom: 6pt;">${item}</li>`;
        });
      }
      html += `</ul>`;
      break;
    case 'table':
      if (block.table_data && Array.isArray(block.table_data)) {
        html += `<div style="overflow-x: auto; margin: 15pt 0;"><table style="width: 100%; border-collapse: collapse; font-family: 'Times New Roman', Times, serif; font-size: 10pt; color: #000; border: 1px solid #000;"><tbody>`;
        block.table_data.forEach((row: any, i: number) => {
          html += `<tr>`;
          if (Array.isArray(row)) {
            row.forEach((cell: any) => {
              const isHeaderRow = i === 0;
              const isEmptyHeader = isHeaderRow && row.every((c: string) => !c || !c.trim());
              const tag = isHeaderRow && !isEmptyHeader ? 'th' : 'td';
              const style = isHeaderRow && !isEmptyHeader
                ? 'border: 1px solid #000; padding: 6pt; font-weight: bold; text-align: left; vertical-align: bottom; background-color: #f9f9f9;'
                : 'border: 1px solid #000; padding: 6pt; text-align: left; vertical-align: top;';
              html += `<${tag} style="${style}">${cell}</${tag}>`;
            });
          }
          html += `</tr>`;
        });
        html += `</tbody></table></div>`;
      }
      break;
    default:
      html = `<p style="font-family: 'Times New Roman', Times, serif; font-size: 11pt; margin-bottom: 12pt; line-height: 1.5; color: #000; ${align}">${content}</p>`;
  }
  return html;
}