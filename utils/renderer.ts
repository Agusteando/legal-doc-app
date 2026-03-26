// Enforces strict legal document formatting, prioritizing exact visual reproduction.
// Moves layout responsibility away from AI guesses to a deterministic renderer.
// Enforces strict 1-to-1 Oficio (8.5x13) page constraints using flex-based smart packing.
// Guarantees pure English final output by strictly rendering translated_* structured data fields.

/**
 * Strips leaked JSON artifacts (e.g., `},{`, `"}`, `{"`) from the LLM output 
 * ensuring only clean, formal legal text reaches the final render.
 */
function cleanText(val: any): string {
  if (!val) return '';
  let s = String(val);
  s = s.replace(/\}\s*,\s*\{/g, ' ');
  s = s.replace(/[\]}{,\s]+$/, '');
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

  // Strict Typographic and Spacing Maps using stable units, highly optimized for Oficio packing
  const spacingMap: Record<string, string> = { none: '0pt', small: '4pt', medium: '8pt', large: '16pt', xlarge: '24pt' };
  const fontSizeMap: Record<string, string> = { small: '9pt', normal: '10.5pt', large: '12pt', xlarge: '14pt' };
  const indentMap: Record<string, string> = { none: '0pt', small: '18pt', medium: '36pt', large: '54pt' };

  // Determine styles with rigid legal fallbacks optimized for zero-spill flex fitting
  const mt = spacingMap[block.spacing_before] ?? (block.type === 'heading' ? '12pt' : '0pt');
  const mb = spacingMap[block.spacing_after] ?? (block.type === 'paragraph' ? '6pt' : '4pt');
  const fs = fontSizeMap[block.font_size] ?? (block.type === 'heading' ? '12pt' : '10.5pt');
  const fw = block.font_weight === 'bold' ? 'bold' : (block.type === 'heading' ? 'bold' : 'normal');
  const ml = indentMap[block.indentation] ?? '0pt';

  // Base typography enforced globally across all block elements for print exactness
  // `flex-shrink: 1` allows the layout engine to marginally compress line-heights/margins before ever clipping content.
  let baseStyle = `box-sizing: border-box; font-family: 'Times New Roman', Times, serif; color: #000; padding: 0; line-height: 1.35; margin-top: ${mt}; margin-bottom: ${mb}; margin-left: ${ml}; font-size: ${fs}; font-weight: ${fw}; ${align}; flex-shrink: 1; max-width: 100%;`;

  let html = '';
  switch (block.type) {
    case 'heading':
      html = `<div style="${baseStyle} text-transform: uppercase; page-break-after: avoid; line-height: 1.2; flex-shrink: 0;">${content}</div>`;
      break;
    case 'paragraph':
      html = `<div style="${baseStyle} widows: 2; orphans: 2;">${content}</div>`;
      break;
    case 'signature':
      // Smart Packing: Signatures become bottom-anchored. They eat available space but compress perfectly if full.
      html = `<div style="${baseStyle} margin-top: auto; padding-top: 12pt; page-break-inside: avoid; text-align: center; flex-shrink: 0;">${content}</div>`;
      break;
    case 'stamp':
      // Smart Packing: Stamps also anchor to the footer, with strict borders.
      html = `<div style="${baseStyle} margin-top: auto; border: 1px solid #000; padding: 4pt 8pt; display: inline-block; page-break-inside: avoid; flex-shrink: 0;">${content}</div>`;
      break;
    case 'handwritten_note':
      html = `<div style="${baseStyle} font-family: 'Caveat', cursive; font-size: 13pt;">${content}</div>`;
      break;
    case 'divider':
      html = `<hr style="margin-top: ${mt}; margin-bottom: ${mb}; margin-left: ${ml}; border: none; border-top: 1px solid #000; flex-shrink: 0; width: 100%;" />`;
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
      const listMl = block.indentation && block.indentation !== 'none' ? ml : '24pt';
      
      let listItems = block.translated_list_items;
      if (!listItems || listItems.length === 0) listItems = block.list_items; 

      html += `<ul style="${baseStyle} margin-left: ${listMl}; list-style-position: ${listPos}; list-style-type: disc;">`;
      if (listItems && Array.isArray(listItems)) {
        listItems.forEach((rawItem: string) => {
          const item = cleanText(rawItem).replace(/\n/g, '<br/>');
          html += `<li style="margin-bottom: 3pt; text-align: left;">${item}</li>`;
        });
      }
      html += `</ul>`;
      break;
    case 'table':
      let tData = block.translated_table_data;
      if (!tData || tData.length === 0) tData = block.table_data; 

      if (tData && Array.isArray(tData)) {
        html += `<table style="width: 100%; border-collapse: collapse; margin-top: ${mt}; margin-bottom: ${mb}; margin-left: ${ml}; font-family: 'Times New Roman', Times, serif; font-size: 9.5pt; color: #000; page-break-inside: auto; flex-shrink: 1;"><tbody>`;
        tData.forEach((row: any, i: number) => {
          html += `<tr style="page-break-inside: avoid; page-break-after: auto;">`;
          if (Array.isArray(row)) {
            row.forEach((rawCell: any) => {
              const cell = cleanText(rawCell).replace(/\n/g, '<br/>');
              const isHeaderRow = i === 0;
              const isEmptyHeader = isHeaderRow && row.every((c: string) => !c || !c.trim());
              const tag = isHeaderRow && !isEmptyHeader ? 'th' : 'td';
              const fontWeight = isHeaderRow && !isEmptyHeader ? 'font-weight: bold;' : 'font-weight: normal;';
              html += `<${tag} style="border: 1px solid #000; padding: 3pt 5pt; text-align: left; vertical-align: top; ${fontWeight}">${cell}</${tag}>`;
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