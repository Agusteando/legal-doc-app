// Enforces strict legal document formatting, prioritizing exact visual reproduction.
// Uses explicit line breaks and strict typography to mirror the raw legal source precisely.
export function renderLayoutBlock(block: any): string {
  const align = block.alignment ? `text-align: ${block.alignment};` : 'text-align: left;';
  
  // Explicitly map newline characters to HTML breaks for true fidelity
  const rawContent = block.translated_content || ''; 
  const content = rawContent.replace(/\n/g, '<br/>');

  let html = '';
  // Force clean, standard print typography at the base of every block
  const baseStyle = `font-family: 'Times New Roman', Times, serif; color: #000; margin: 0; padding: 0;`;

  switch (block.type) {
    case 'heading':
      html = `<div style="${baseStyle} font-size: 12pt; font-weight: bold; margin-top: 16pt; margin-bottom: 8pt; text-transform: uppercase; ${align}">${content}</div>`;
      break;
    case 'paragraph':
      html = `<div style="${baseStyle} font-size: 11pt; margin-bottom: 12pt; line-height: 1.5; ${align}">${content}</div>`;
      break;
    case 'signature':
      html = `<div style="${baseStyle} font-size: 11pt; margin-top: 24pt; margin-bottom: 12pt; ${align}">${content}</div>`;
      break;
    case 'stamp':
      // Stamps stripped of decorative nonsense. Only pure layout borders if legible text exists.
      html = `<div style="${baseStyle} font-size: 10pt; font-weight: bold; margin-top: 12pt; margin-bottom: 12pt; border: 1px solid #000; padding: 4pt; display: inline-block; ${align}">${content}</div>`;
      break;
    case 'handwritten_note':
      // Distinct font for handwritten insertions, but kept highly readable
      html = `<div style="${baseStyle} font-family: 'Caveat', cursive; font-size: 14pt; margin-bottom: 12pt; color: #111; ${align}">${content}</div>`;
      break;
    case 'divider':
      html = `<hr style="margin: 16pt 0; border: none; border-top: 1px solid #000;" />`;
      break;
    case 'form_field':
      html = `<div style="${baseStyle} font-size: 11pt; margin-bottom: 8pt; ${align}"><strong>${block.form_label || ''}:</strong> ${block.form_value || ''}</div>`;
      break;
    case 'list':
      const listStyle = block.alignment === 'center' ? 'list-style-position: inside;' : 'list-style-position: outside; margin-left: 24pt;';
      html += `<ul style="${baseStyle} font-size: 11pt; line-height: 1.5; margin-bottom: 12pt; list-style-type: disc; ${align} ${listStyle}">`;
      if (block.list_items && Array.isArray(block.list_items)) {
        block.list_items.forEach((item: string) => {
          html += `<li style="margin-bottom: 4pt;">${item.replace(/\n/g, '<br/>')}</li>`;
        });
      }
      html += `</ul>`;
      break;
    case 'table':
      if (block.table_data && Array.isArray(block.table_data)) {
        html += `<table style="width: 100%; border-collapse: collapse; margin-bottom: 16pt; ${baseStyle} font-size: 10pt;"><tbody>`;
        block.table_data.forEach((row: any, i: number) => {
          html += `<tr>`;
          if (Array.isArray(row)) {
            row.forEach((cell: any) => {
              const isHeaderRow = i === 0;
              const isEmptyHeader = isHeaderRow && row.every((c: string) => !c || !c.trim());
              const tag = isHeaderRow && !isEmptyHeader ? 'th' : 'td';
              const fontWeight = isHeaderRow && !isEmptyHeader ? 'font-weight: bold;' : 'font-weight: normal;';
              html += `<${tag} style="border: 1px solid #000; padding: 4pt 6pt; text-align: left; vertical-align: top; ${fontWeight}">${cell.replace(/\n/g, '<br/>')}</${tag}>`;
            });
          }
          html += `</tr>`;
        });
        html += `</tbody></table>`;
      }
      break;
    default:
      html = `<div style="${baseStyle} font-size: 11pt; margin-bottom: 12pt; line-height: 1.5; ${align}">${content}</div>`;
  }
  return html;
}