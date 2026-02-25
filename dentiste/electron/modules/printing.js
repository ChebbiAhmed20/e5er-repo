/**
 * Printing Module
 * 
 * Handles secure printing from Electron main process.
 */

/**
 * Print HTML content
 */
async function printHtml(window, html, options = {}) {
  if (!window || !window.webContents) {
    throw new Error('Invalid window');
  }
  
  // Create a hidden window for printing
  const { BrowserWindow } = require('electron');
  const printWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  
  try {
    // Load HTML content
    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    
    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Print with options
    const printOptions = {
      silent: options.silent || false,
      printBackground: options.printBackground !== false,
      margins: options.margins || {
        marginType: 'default',
      },
    };
    
    await printWindow.webContents.print(printOptions);
    
    // Close window after a delay
    setTimeout(() => {
      printWindow.close();
    }, 1000);
  } catch (error) {
    printWindow.close();
    throw error;
  }
}

/**
 * Print PDF blob
 */
async function printPdf(window, pdfBlob, options = {}) {
  if (!window || !window.webContents) {
    throw new Error('Invalid window');
  }
  
  // Convert base64 to buffer
  const pdfBuffer = Buffer.from(pdfBlob, 'base64');
  
  // Save to temp file
  const fs = require('fs').promises;
  const path = require('path');
  const { app } = require('electron');
  
  const tempPath = path.join(app.getPath('temp'), `print_${Date.now()}.pdf`);
  
  try {
    await fs.writeFile(tempPath, pdfBuffer);
    
    // Open PDF in system default viewer and trigger print
    const { shell } = require('electron');
    await shell.openPath(tempPath);
    
    // Note: On Windows, this opens the PDF viewer.
    // For actual printing, you might need to use a different approach
    // or rely on the user to print from the viewer.
    
    // Clean up temp file after delay
    setTimeout(async () => {
      try {
        await fs.unlink(tempPath);
      } catch (error) {
        // Ignore cleanup errors
      }
    }, 60000); // 1 minute
    
  } catch (error) {
    throw new Error(`Failed to print PDF: ${error.message}`);
  }
}

module.exports = {
  printHtml,
  printPdf,
};
