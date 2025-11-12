import { mdToPdf } from 'md-to-pdf';

async function convertToPdf() {
  try {
    const pdf = await mdToPdf(
      { path: 'PERFORMANCE_SCORE_GUIDE.md' },
      {
        dest: 'PERFORMANCE_SCORE_GUIDE.pdf',
        launch_options: {
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
          ]
        },
        css: 'pdf-styles.css',
        pdf_options: {
          format: 'A4',
          margin: {
            top: '20mm',
            right: '15mm',
            bottom: '20mm',
            left: '15mm'
          },
          printBackground: true,
          preferCSSPageSize: true
        }
      }
    );

    console.log('✅ PDF created successfully: PERFORMANCE_SCORE_GUIDE.pdf');
    console.log(`📄 File size: ${(pdf.content.length / 1024).toFixed(2)} KB`);
  } catch (error) {
    console.error('❌ Error creating PDF:', error.message);
    process.exit(1);
  }
}

convertToPdf();
