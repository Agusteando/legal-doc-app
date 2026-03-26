// The deterministic JSON to HTML compiler logic shared across API and Export workflows.
export function renderLayoutBlock(block: any): string {
  const align = block.alignment ? `text-align: ${block.alignment};` : 'text-align: left;';
  const content = block.translated_content || ''; 

  let html = '';
  switch (block.type) {
    case 'heading':
      html = `<h2 style="font-family: 'Inter', sans-serif; font-size: 1.25rem; font-weight: 700; margin-top: 2rem; margin-bottom: 1rem; color: #111827; letter-spacing: -0.01em; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.5rem; ${align}">${content}</h2>`;
      break;
    case 'paragraph':
      html = `<p style="margin-bottom: 1rem; line-height: 1.7; color: #374151; ${align}">${content}</p>`;
      break;
    case 'signature':
      html = `<div style="margin: 3rem 0 1.5rem 0; padding-top: 0.75rem; border-top: 1px solid #111827; width: 280px; ${align}">
                <span style="font-size: 0.9rem; font-weight: 600; color: #111827; display: block;">${content}</span>
              </div>`;
      break;
    case 'stamp':
      html = `<div style="margin: 2rem 0; padding: 1.5rem; border: 3px double #4b5563; color: #374151; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; display: inline-block; border-radius: 4px; max-width: 300px; text-align: center; font-size: 0.85rem; ${align}">
                ${content}
              </div>`;
      break;
    case 'handwritten_note':
      html = `<div style="margin: 1.5rem 0; padding: 1rem; color: #1e3a8a; font-family: 'Caveat', cursive; font-size: 1.35rem; line-height: 1.3; transform: rotate(-1deg); background-color: #eff6ff; border-left: 3px solid #3b82f6; width: fit-content; max-width: 90%; box-shadow: 2px 2px 5px rgba(0,0,0,0.05); ${align}">
                ${content}
              </div>`;
      break;
    case 'divider':
      html = `<hr style="margin: 2.5rem 0; border: none; border-top: 1px solid #d1d5db;" />`;
      break;
    case 'form_field':
      html = `<div style="margin-bottom: 0.75rem; display: flex; align-items: baseline; font-size: 0.95rem;">
                <span style="font-weight: 600; margin-right: 0.75rem; color: #111827;">${block.form_label || ''}:</span>
                <span style="flex-grow: 1; border-bottom: 1px dotted #9ca3af; padding-bottom: 2px; color: #374151;">${block.form_value || ''}</span>
              </div>`;
      break;
    case 'list':
      const listStyle = block.alignment === 'center' ? 'list-style-position: inside;' : '';
      html += `<ul style="margin: 1rem 0; padding-left: 2.5rem; color: #374151; line-height: 1.7; list-style-type: square; ${align} ${listStyle}">`;
      if (block.list_items && Array.isArray(block.list_items)) {
        block.list_items.forEach((item: string) => {
          html += `<li style="margin-bottom: 0.5rem; padding-left: 0.5rem;">${item}</li>`;
        });
      }
      html += `</ul>`;
      break;
    case 'table':
      if (block.table_data && Array.isArray(block.table_data)) {
        html += `<div style="overflow-x: auto;"><table style="width: 100%; border-collapse: collapse; margin: 2rem 0; font-size: 0.9rem; color: #374151; border: 1px solid #e5e7eb;"><tbody>`;
        block.table_data.forEach((row: any, i: number) => {
          html += `<tr style="${i % 2 === 0 ? 'background-color: #f9fafb;' : 'background-color: #ffffff;'}">`;
          if (Array.isArray(row)) {
            row.forEach((cell: any) => {
              const isHeaderRow = i === 0;
              const isEmptyHeader = isHeaderRow && row.every((c: string) => !c || !c.trim());
              const tag = isHeaderRow && !isEmptyHeader ? 'th' : 'td';
              const style = isHeaderRow && !isEmptyHeader
                ? 'border: 1px solid #d1d5db; padding: 0.875rem; background-color: #f3f4f6; font-weight: 600; color: #111827; text-align: left; vertical-align: bottom;'
                : 'border: 1px solid #e5e7eb; padding: 0.875rem; text-align: left; vertical-align: top;';
              html += `<${tag} style="${style}">${cell}</${tag}>`;
            });
          }
          html += `</tr>`;
        });
        html += `</tbody></table></div>`;
      }
      break;
    default:
      html = `<p style="margin-bottom: 1rem; line-height: 1.7; color: #374151; ${align}">${content}</p>`;
  }
  return html;
}