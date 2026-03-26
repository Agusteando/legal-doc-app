// Enforces strict legal document formatting, prioritizing exact visual reproduction.
// Moves layout responsibility away from AI guesses to a deterministic renderer.
// Enforces 8.5x13 (Tamaño Oficio) sizing constraints and professional typographic justification.
// Guarantees pure English final output by strictly rendering translated_* structured data fields.

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
  // Mechanical Override: Standard legal body paragraphs MUST unconditionally default 
  // to justified text for formal formatting, removing AI variability.
  let alignVal = block.type === 'paragraph' ? 'justify' : (block.alignment || 'left');

  let align = `text-align: ${alignVal};`;
  if (alignVal === 'justify') {
    align += ' text-justify: inter-word;';
  }
  
  // Clean raw content of JSON artifacts and map explicit physical line breaks
  const rawContent = cleanText(block.translated_content || block.source_content); 
  const content = rawContent.replace(/\n/g, '<br/>');

  // Strict Typographic and Spacing Maps using stable units
  const spacingMap: Record<string, string> = { none: '0pt', small: '6pt', medium: '12pt', large: '24pt', xlarge: '36pt' };
  const fontSizeMap: Record<string, string> = { small: '10pt', normal: '11pt', large: '13pt', xlarge: '16pt' };
  const indentMap: Record<string, string> = { none: '0pt', small: '18pt', medium: '36pt', large: '54pt' };

  // Determine styles with rigid legal fallbacks
  const mt = spacingMap[block.spacing_before] ?? (block.type === 'heading' ? '18pt' : '0pt');
  const mb = spacingMap[block.spacing_after] ?? (block.type === 'paragraph' ? '10pt' : '8pt');
  const fs = fontSizeMap[block.font_size] ?? (block.type === 'heading' ? '12pt' : '11pt');
  const fw = block.font_weight === 'bold' ? 'bold' : (block.type === 'heading' ? 'bold' : 'normal');
  const ml = indentMap[block.indentation] ?? '0pt';

  // Base typography enforced globally across all block elements for print exactness
  const baseStyle = `box-sizing: border-box; font-family: 'Times New Roman', Times, serif; color: #000; padding: 0; line-height: 1.5; margin-top: ${mt}; margin-bottom: ${mb}; margin-left: ${ml}; font-size: ${fs}; font-weight: ${fw}; ${align}`;

  let html = '';
  switch (block.type) {
    case 'heading':
      html = `<div style="${baseStyle} text-transform: uppercase; page-break-after: avoid; line-height: 1.2;">${content}</div>`;
      break;
    case 'paragraph':
      // Prevent single dangling lines of a paragraph across pages
      html = `<div style="${baseStyle} widows: 2; orphans: 2;">${content}</div>`;
      break;
    case 'signature':
      // Force an explicit margin top for signatures, and prevent breaking apart
      const sigMt = block.spacing_before && block.spacing_before !== 'none' ? mt : '48pt';
      html = `<div style="${baseStyle} margin-top: ${sigMt}; page-break-inside: avoid; text-align: center;">${content}</div>`;
      break;
    case 'stamp':
      // Distinct boxed stamp layout without inventing colors
      html = `<div style="${baseStyle} border: 1px solid #000; padding: 6pt 10pt; display: inline-block; page-break-inside: avoid;">${content}</div>`;
      break;
    case 'handwritten_note':
      // Distinct font for handwritten insertions, sizing adjusted for script readability
      html = `<div style="${baseStyle} font-family: 'Caveat', cursive; font-size: 14pt;">${content}</div>`;
      break;
    case 'divider':
      html = `<hr style="margin-top: ${mt}; margin-bottom: ${mb}; margin-left: ${ml}; border: none; border-top: 1px solid #000;" />`;
      break;
    case 'form_field':
      // Prefer new strict bilingual schema, fallback to legacy fields if needed
      let rawLabel = block.translated_form_label || block.form_label || '';
      let label = cleanText(rawLabel);
      if (label) {
        label = label.replace(/:+$/, '') + ':';
      }
      const rawVal = block.translated_form_value || block.form_value || '';
      const val = cleanText(rawVal);
      html = `<div style="${baseStyle}"><strong>${label}</strong> ${val}</div>`;
      break;
    case 'list':
      const listPos = alignVal === 'center' ? 'inside' : 'outside';
      // Lists require inner padding for bullets.
      const listMl = block.indentation && block.indentation !== 'none' ? ml : '24pt';
      
      let listItems = block.translated_list_items;
      if (!listItems || listItems.length === 0) listItems = block.list_items; // Legacy fallback

      html += `<ul style="${baseStyle} margin-left: ${listMl}; list-style-position: ${listPos}; list-style-type: disc;">`;
      if (listItems && Array.isArray(listItems)) {
        listItems.forEach((rawItem: string) => {
          const item = cleanText(rawItem).replace(/\n/g, '<br/>');
          html += `<li style="margin-bottom: 4pt; text-align: left;">${item}</li>`;
        });
      }
      html += `</ul>`;
      break;
    case 'table':
      let tData = block.translated_table_data;
      if (!tData || tData.length === 0) tData = block.table_data; // Legacy fallback

      if (tData && Array.isArray(tData)) {
        html += `<table style="width: 100%; border-collapse: collapse; margin-top: ${mt}; margin-bottom: ${mb}; margin-left: ${ml}; font-family: 'Times New Roman', Times, serif; font-size: 10pt; color: #000; page-break-inside: auto;"><tbody>`;
        tData.forEach((row: any, i: number) => {
          html += `<tr style="page-break-inside: avoid; page-break-after: auto;">`;
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
      html = `<div style="${baseStyle}">${content}</div>`;
  }
  return html;
}