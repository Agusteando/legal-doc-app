// Enforces strict legal document formatting, prioritizing exact visual reproduction.
// Consumes spacing, indentation, and font weight hierarchy directly from the enriched layout schema.

/**
 * Strips leaked JSON artifacts (e.g., `},{`, `"}`, `{"`) from the LLM output 
 * ensuring only clean, formal legal text reaches the final render.
 */
function cleanText(val: any): string {
  if (!val) return '';
  let s = String(val);
  // 1. Remove hallucinated JSON object boundaries inside the text
  s = s.replace(/\}\s*,\s*\{/g, ' ');
  // 2. Remove dangling JSON syntax at the very end (e.g., "},{", "},", "}")
  s = s.replace(/[\]}{,\s]+$/, '');
  // 3. Remove dangling JSON syntax at the absolute beginning
  s = s.replace(/^[\[}{,\s]+/, '');
  return s.trim();
}

export function renderLayoutBlock(block: any): string {
  let alignVal = block.alignment || 'left';
  
  // Mechanical Override: Standard legal body paragraphs should mechanically default 
  // to justified text for formal formatting, even if the AI loosely mapped them as 'left'.
  if (block.type === 'paragraph' && alignVal === 'left') {
    alignVal = 'justify';
  }

  let align = `text-align: ${alignVal};`;
  if (alignVal === 'justify') {
    align += ' text-justify: inter-word;';
  }
  
  // Clean raw content of JSON artifacts and map explicit physical line breaks
  const rawContent = cleanText(block.translated_content); 
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
      // Clean artifacts and ensure exactly ONE colon at the end of the label, preventing duplicated colons
      let label = cleanText(block.form_label);
      if (label) {
        label = label.replace(/:+$/, '') + ':';
      }
      const val = cleanText(block.form_value);
      html = `<div style="${baseStyle} ${align}"><strong>${label}</strong> ${val}</div>`;
      break;
    case 'list':
      const listPos = alignVal === 'center' ? 'inside' : 'outside';
      // Lists require inner padding for bullets. We don't stack margin-left unnecessarily.
      const listMl = block.indentation && block.indentation !== 'none' ? ml : '24pt';
      html += `<ul style="${baseStyle} margin-left: ${listMl}; list-style-position: ${listPos}; list-style-type: disc; ${align}">`;
      if (block.list_items && Array.isArray(block.list_items)) {
        block.list_items.forEach((rawItem: string) => {
          const item = cleanText(rawItem).replace(/\n/g, '<br/>');
          html += `<li style="margin-bottom: 3pt;">${item}</li>`;
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
            row.forEach((rawCell: any) => {
              const cell = cleanText(rawCell).replace(/\n/g, '<br/>');
              const isHeaderRow = i === 0;
              const isEmptyHeader = isHeaderRow && row.every((c: string) => !c || !c.trim());
              const tag = isHeaderRow && !isEmptyHeader ? 'th' : 'td';
              const fontWeight = isHeaderRow && !isEmptyHeader ? 'font-weight: bold;' : 'font-weight: normal;';
              html += `<${tag} style="border: 1px solid #000; padding: 4pt 6pt; text-align: left; vertical-align: top; ${fontWeight}">${cell}</${tag}>`;
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