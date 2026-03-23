export function renderLayoutBlock(block: any): string {
  const align = block.alignment ? `text-align: ${block.alignment};` : 'text-align: left;';
  const content = block.translated_content || ''; 

  let html = '';
  switch (block.type) {
    case 'heading':
      html = `<h2 style="font-size: 1.35rem; font-weight: 700; margin-top: 1.75rem; margin-bottom: 0.75rem; color: #111827; ${align}">${content}</h2>`;
      break;
    case 'paragraph':
      html = `<p style="margin-bottom: 1.125rem; line-height: 1.7; color: #374151; ${align}">${content}</p>`;
      break;
    case 'signature':
      html = `<div style="margin: 2.5rem 0 1rem 0; padding-top: 0.5rem; border-top: 1px solid #000; width: 250px; ${align}">
                <span style="font-size: 0.875rem; font-style: italic; color: #6b7280;">${content || 'Signature'}</span>
              </div>`;
      break;
    case 'stamp':
      html = `<div style="margin: 1.5rem 0; padding: 1rem 1.5rem; border: 3px solid #991b1b; color: #991b1b; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; display: inline-block; border-radius: 4px; transform: rotate(-3deg); ${align}">
                ${content || 'STAMP'}
              </div>`;
      break;
    case 'divider':
      html = `<hr style="margin: 2rem 0; border: none; border-top: 1px solid #d1d5db;" />`;
      break;
    case 'form_field':
      html = `<div style="margin-bottom: 1rem; display: flex; align-items: baseline; font-size: 0.95rem; color: #374151;">
                <span style="font-weight: 600; margin-right: 0.75rem; min-width: 140px; color: #111827;">${block.form_label || ''}:</span>
                <span style="flex-grow: 1; border-bottom: 1px solid #6b7280; padding-bottom: 2px;">${block.form_value || ''}</span>
              </div>`;
      break;
    case 'table':
      if (block.table_data && Array.isArray(block.table_data)) {
        html += `<table style="width: 100%; border-collapse: collapse; margin: 1.5rem 0; font-size: 0.9rem; color: #374151;"><tbody>`;
        block.table_data.forEach((row: any, i: number) => {
          html += `<tr>`;
          if (Array.isArray(row)) {
            row.forEach((cell: any) => {
              const tag = i === 0 ? 'th' : 'td';
              const style = i === 0
                ? 'border: 1px solid #9ca3af; padding: 0.75rem; background-color: #f3f4f6; font-weight: 600; color: #111827; text-align: left;'
                : 'border: 1px solid #d1d5db; padding: 0.75rem; text-align: left;';
              html += `<${tag} style="${style}">${cell}</${tag}>`;
            });
          }
          html += `</tr>`;
        });
        html += `</tbody></table>`;
      }
      break;
    default:
      html = `<p style="margin-bottom: 1rem; line-height: 1.6; color: #374151; ${align}">${content}</p>`;
  }
  return html;
}