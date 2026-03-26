// Enforces strict legal document formatting, prioritizing exact visual reproduction.
// Consumes spacing, indentation, and font weight hierarchy directly from the enriched layout schema.
export function renderLayoutBlock(block: any): string {
  const align = block.alignment ? `text-align: ${block.alignment};` : 'text-align: left;';
  
  // Explicitly map newline characters to HTML breaks for physical line wrapping fidelity
  const rawContent = block.translated_content || ''; 
  const content = rawContent.replace(/\n/g, '<br/>');

  // Typographic and Spacing Maps
  const spacingMap: Record<string, string> = { none: '0pt', small: '6pt', medium: '12pt', large: '24pt', xlarge: '36pt' };
  const fontSizeMap: Record<string, string> = { small: '9pt', normal: '11pt', large: '13pt', xlarge: '16pt' };
  const indentMap: Record<string, string> = { none: '0pt', small: '18pt', medium: '36pt', large: '54pt' };

  // Determine styles with graceful fallbacks for legacy/unprocessed DB data
  const mt = spacingMap[block.spacing_before] ?? (block.type === 'heading' ? '16pt' : '0pt');
  const mb = spacingMap[block.spacing_after] ?? '8pt';
  const fs = fontSizeMap[block.font_size] ?? (block.type === 'heading' ? '12pt' : '11pt');
  const fw = block.font_weight === 'bold' ? 'bold' : (block.type === 'heading' ? 'bold' : 'normal');
  const ml = indentMap[block.indentation] ?? '0pt';

  // Base typography enforced globally across all block elements
  const baseStyle = `font-family: 'Times New Roman', Times, serif; color: #000; padding: 0; line-height: 1.15; margin-top: ${mt}; margin-bottom: ${mb}; margin-left: ${ml}; font-size: ${fs}; font-weight: ${fw};`;

  let html = '';
  switch (block.type) {
    case 'heading':
      html = `<div style="${baseStyle} text-transform: uppercase; ${align}">${content}</div>`;
      break;
    case 'paragraph':
      html = `<div style="${baseStyle} ${align}">${content}</div>`;
      break;
    case 'signature':
      // Force an explicit margin top for signatures if legacy data lacked spacing metadata
      const sigMt = block.spacing_before && block.spacing_before !== 'none' ? mt : '24pt';
      html = `<div style="${baseStyle} margin-top: ${sigMt}; ${align}">${content}</div>`;
      break;
    case 'stamp':
      // Distinct boxed stamp layout without inventing colors
      html = `<div style="${baseStyle} border: 1px solid #000; padding: 4pt 8pt; display: inline-block; ${align}">${content}</div>`;
      break;
    case 'handwritten_note':
      // Distinct font for handwritten insertions, sizing adjusted for script readability
      html = `<div style="${baseStyle} font-family: 'Caveat', cursive; font-size: 14pt; ${align}">${content}</div>`;
      break;
    case 'divider':
      html = `<hr style="margin-top: ${mt}; margin-bottom: ${mb}; margin-left: ${ml}; border: none; border-top: 1px solid #000;" />`;
      break;
    case 'form_field':
      html = `<div style="${baseStyle} ${align}"><strong>${block.form_label || ''}:</strong> ${block.form_value || ''}</div>`;
      break;
    case 'list':
      const listPos = block.alignment === 'center' ? 'inside' : 'outside';
      // Lists require inner padding for bullets. We don't stack margin-left unnecessarily.
      const listMl = block.indentation && block.indentation !== 'none' ? ml : '24pt';
      html += `<ul style="${baseStyle} margin-left: ${listMl}; list-style-position: ${listPos}; list-style-type: disc; ${align}">`;
      if (block.list_items && Array.isArray(block.list_items)) {
        block.list_items.forEach((item: string) => {
          html += `<li style="margin-bottom: 3pt;">${item.replace(/\n/g, '<br/>')}</li>`;
        });
      }
      html += `</ul>`;
      break;
    case 'table':
      if (block.table_data && Array.isArray(block.table_data)) {
        html += `<table style="width: 100%; border-collapse: collapse; margin-top: ${mt}; margin-bottom: ${mb}; margin-left: ${ml}; font-family: 'Times New Roman', Times, serif; font-size: 10pt; color: #000;"><tbody>`;
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
      html = `<div style="${baseStyle} ${align}">${content}</div>`;
  }
  return html;
}