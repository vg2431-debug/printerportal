/**
 * Formats an ISO date string into DD/MM/YYYY, h:mm A/PM
 */
export const formatDateTime = (isoString) => {
  if (!isoString) return 'N/A';
  try {
    const date = new Date(isoString);
    // DD/MM/YYYY
    const datePart = date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    // h:mm A/PM
    const timePart = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return `${datePart}, ${timePart}`;
  } catch (error) {
    console.error('Invalid date string:', isoString);
    return 'Invalid Date';
  }
};

/**
 * Calculates the total cost of a single job
 * (V3: Accepts a *list* of printers or a *single* printer object)
 * @param {object} job - The job object
 *param {object|array} printerOrPrinters - A single printer object or an array of printers
 * @param {object} settings - The global settings object
 * @returns {number} The total calculated cost
 */
export const calculateJobCost = (job, printerOrPrinters, settings) => {
  if (!job || !printerOrPrinters || !settings || !job.ink_consumption_ml) {
    return 0;
  }

  let printer;
  // Check if we were given an array or a single object
  if (Array.isArray(printerOrPrinters)) {
    printer = printerOrPrinters.find(p => p.id === job.printer_id);
  } else {
    printer = printerOrPrinters;
  }
  
  if (!printer || !printer.ink_costs) return 0;

  const { ink_consumption_ml } = job;
  const { ink_costs } = printer;
  const { cost_coefficient } = settings;

  let totalCost = 0;

  for (const [color, mlUsed] of Object.entries(ink_consumption_ml)) {
    const litersUsed = mlUsed / 1000;
    const pricePerLiter = ink_costs[color.toLowerCase()] || 0; 
    totalCost += litersUsed * pricePerLiter;
  }
  
  return totalCost * (cost_coefficient || 1);
};