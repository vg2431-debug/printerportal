import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { useInventory } from '../context/InventoryContext';
import './DashboardPage.css';

// --- Charting ---
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  ChartDataLabels
);

// --- Color Map ---
const INK_COLORS = {
  'cyan': '#00aeef',
  'magenta': '#ec008c',
  'yellow': '#fff200',
  'black': '#231f20',
  'k': '#231f20',
  'lc': '#7fdeff',
  'light cyan': '#7fdeff',
  'lm': '#f797d2',
  'light magenta': '#f797d2',
  'lk': '#777777',
  'light black': '#777777',
  'orange': '#f7941d',
  'green': '#009245',
  'red': '#ed1c24',
  'white': '#ffffff',
  'varnish': '#f0e9c0',
  'default1': '#6610f2',
  'default2': '#fd7e14',
};

const getInkColor = (colorName, index) => {
  const c = colorName.toLowerCase();
  return INK_COLORS[c] || INK_COLORS[`default${(index % 2) + 1}`] || '#6c757d';
};

// --- Helper Functions ---

const getLastNDays = (n) => {
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toLocaleDateString('en-CA')); // YYYY-MM-DD
  }
  return days;
};

const calculateJobCost = (job, printers, settings) => {
  if (!job || !printers || !settings) return 0;
  
  const printer = printers.find(p => p.id === job.printer_id);
  if (!printer || !printer.ink_costs || !job.ink_consumption_ml) return 0;

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


// --- Main Dashboard Component ---

const DashboardPage = () => {
  const [kpiData, setKpiData] = useState(null);
  const [lineChartData, setLineChartData] = useState(null);
  const [doughnutData, setDoughnutData] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  
  const { settings, loading: settingsLoading } = useSettings();
  const { inventory, loading: inventoryLoading } = useInventory();
  
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (settingsLoading || inventoryLoading) {
        return;
      }

      try {
        setPageLoading(true);
        
        const [printersRes, jobsRes] = await Promise.all([
          api.get('/printers/'),
          api.get('/jobs/'),
        ]);
        
        const printers = printersRes.data || [];
        const jobs = jobsRes.data || [];

        processDashboardData(printers, jobs, settings, inventory);

      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
        setError("Could not load dashboard data.");
      } finally {
        setPageLoading(false);
      }
    };
    
    fetchData();
  }, [settings, inventory, settingsLoading, inventoryLoading]);

  const processDashboardData = (printers, jobs, settings, inventory) => {
    try {
      const currency = settings?.currency_symbol || 'AED'; 
      
      const N_DAYS_KPI = 30;
      const N_DAYS_FORECAST = 90;
      
      const today = new Date();
      const kpiStartDate = new Date();
      kpiStartDate.setDate(today.getDate() - N_DAYS_KPI);
      
      const forecastStartDate = new Date();
      forecastStartDate.setDate(today.getDate() - N_DAYS_FORECAST);

      const jobsLast30Days = jobs.filter(j => 
        j.print_date && new Date(j.print_date) >= kpiStartDate
      );
      const jobsLast90Days = jobs.filter(j => 
        j.print_date && new Date(j.print_date) >= forecastStartDate
      );

      // --- 1. Process KPIs (Last 30 Days) ---
      let totalCost = 0;
      let totalArea = 0;
      const printerCounts = {};

      jobsLast30Days.forEach(job => {
        totalCost += calculateJobCost(job, printers, settings);
        totalArea += job.printed_area_sqm || 0;
        printerCounts[job.printer_id] = (printerCounts[job.printer_id] || 0) + (job.copies || 1);
      });

      let mostActivePrinter = "N/A";
      if (Object.keys(printerCounts).length > 0) {
        const mostActiveId = Object.keys(printerCounts).reduce((a, b) => 
          printerCounts[a] > printerCounts[b] ? a : b
        );
        const printer = printers.find(p => p.id === mostActiveId);
        if (printer) mostActivePrinter = printer.printer_name;
      }
      
      setKpiData({
        totalCost: `${totalCost.toFixed(2)} ${currency}`,
        totalJobs: jobsLast30Days.reduce((sum, j) => sum + (j.copies || 1), 0),
        totalArea: `${totalArea.toFixed(2)} m²`,
        mostActivePrinter,
      });

      // --- 2. Process Line Chart (Last 30 Days) ---
      const labels = getLastNDays(N_DAYS_KPI);
      const dailyCost = new Array(N_DAYS_KPI).fill(0);
      const dailyInk = new Array(N_DAYS_KPI).fill(0);

      jobsLast30Days.forEach(job => {
        const dateStr = new Date(job.print_date).toLocaleDateString('en-CA');
        const index = labels.indexOf(dateStr);
        if (index > -1) {
          dailyCost[index] += calculateJobCost(job, printers, settings);
          dailyInk[index] += job.total_ink_ml || 0;
        }
      });

      setLineChartData({
        labels,
        datasets: [
          {
            label: `Total Ink Cost (${currency})`,
            data: dailyCost.map(c => c.toFixed(2)),
            borderColor: 'rgb(53, 162, 235)',
            backgroundColor: 'rgba(53, 162, 235, 0.5)',
            yAxisID: 'yCost',
          },
          {
            label: 'Total Ink (ml)',
            data: dailyInk,
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.5)',
            yAxisID: 'yInk',
          },
        ],
      });

      // --- 3. Process Doughnut Chart (All Time) ---
      const inkByColor = {};
      jobs.forEach(job => {
        if (job.ink_consumption_ml) {
          for (const [color, ml] of Object.entries(job.ink_consumption_ml)) {
            const colorKey = color.toLowerCase();
            inkByColor[colorKey] = (inkByColor[colorKey] || 0) + ml;
          }
        }
      });
      
      const chartLabels = Object.keys(inkByColor);
      const chartData = Object.values(inkByColor);
      const chartColors = chartLabels.map((label, index) => getInkColor(label, index));

      setDoughnutData({
        labels: chartLabels.map(label => `${label} (${inkByColor[label].toFixed(0)} ml)`),
        datasets: [{
          label: 'Total Ink (ml) Used',
          data: chartData,
          backgroundColor: chartColors,
          borderColor: '#fff',
          borderWidth: 1,
        }]
      });
      
      // --- 4. Process Predictive Forecast (NEW AI LOGIC) ---
      const consumption90Day = {};
      jobsLast90Days.forEach(job => {
        if (job.ink_consumption_ml) {
          for (const [color, ml] of Object.entries(job.ink_consumption_ml)) {
            const colorKey = color.toLowerCase();
            consumption90Day[colorKey] = (consumption90Day[colorKey] || 0) + ml;
          }
        }
      });
      
      const stockByColor = {};
      const safeInventory = Array.isArray(inventory) ? inventory : [];
      
      printers.forEach(printer => {
        if (printer.ink_link) {
          for (const [color, inventoryId] of Object.entries(printer.ink_link)) {
            if (inventoryId) {
              const stockItem = safeInventory.find(item => item.id === inventoryId);
              if (stockItem) {
                const colorKey = color.toLowerCase();
                const totalVolume = (stockItem.stock_on_hand * stockItem.unit_volume_ml);
                stockByColor[colorKey] = (stockByColor[colorKey] || 0) + totalVolume;
              }
            }
          }
        }
      });

      const finalForecasts = {};
      const allColors = new Set([...Object.keys(consumption90Day), ...Object.keys(stockByColor)]);

      allColors.forEach(colorKey => {
        const totalConsumed90Days = consumption90Day[colorKey] || 0;
        const burnRate = totalConsumed90Days / N_DAYS_FORECAST;
        const forecastedNeed = burnRate * 30;
        const stock = stockByColor[colorKey] || 0;
        const surplus = stock - forecastedNeed;
        
        let statusText = 'OK';
        let statusClass = 'ok';
        if (surplus < 0) {
          statusText = 'Order Now';
          statusClass = 'order';
        } else if (surplus < (forecastedNeed * 0.5)) { // Less than 15 days buffer
          statusText = 'Low Stock';
          statusClass = 'low';
        }
        
        finalForecasts[colorKey] = {
          burnRate: burnRate,
          forecastedNeed: forecastedNeed,
          stock: stock,
          surplus: surplus,
          statusText: statusText,
          statusClass: statusClass
        };
      });

      setForecastData(finalForecasts);
      
    } catch (e) {
      console.error("Error during data processing:", e);
      setError("Failed to process dashboard data.");
    }
  };

  // --- Render ---

  if (pageLoading || settingsLoading || inventoryLoading) {
    return <div>Loading Dashboard...</div>;
  }
  
  if (error) {
    return <div className="error">{error}</div>;
  }
  
  if (!kpiData) {
    return <div>Preparing dashboard...</div>;
  }
  
  const lineOptions = {
    responsive: true,
    maintainAspectRatio: true, // Keep this true for the line chart
    scales: {
      yCost: { type: 'linear', display: true, position: 'left', },
      yInk: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false, }, },
    },
    plugins: {
      legend: {
        position: 'top',
      },
    },
  };
  
  const doughnutOptions = {
    responsive: true,
    // --- THIS IS THE FIX ---
    maintainAspectRatio: true, // Set to true
    aspectRatio: 1.5, // Make it wider than it is tall (e.g., 2) or 1 for square
    // --- END FIX ---
    plugins: {
      legend: {
        display: false,
      },
      datalabels: {
        formatter: (value, ctx) => {
          const sum = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
          if (sum === 0) return '0%';
          const percentage = (value * 100 / sum).toFixed(1) + '%';
          return percentage;
        },
        color: '#fff',
        font: {
          weight: 'bold',
          size: 14,
        },
        textStrokeColor: '#000',
        textStrokeWidth: 1
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            return `${label}: ${value.toFixed(2)} ml`;
          }
        }
      }
    }
  };

  return (
    <div className="dashboard-page">
      <h2>Dashboard</h2>

      {/* --- 1. KPIs --- */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <h4>Total Cost (Last 30 Days)</h4>
          <div className="value">{kpiData.totalCost}</div>
        </div>
        <div className="kpi-card">
          <h4>Total Jobs (Last 30 Days)</h4>
          <div className="value">{kpiData.totalJobs}</div>
        </div>
        <div className="kpi-card">
          <h4>Total Area (Last 30 Days)</h4>
          <div className="value">{kpiData.totalArea}</div>
        </div>
        <div className="kpi-card">
          <h4>Most Active Printer</h4>
          <div className="value" style={{fontSize: '1.75rem'}}>{kpiData.mostActivePrinter}</div>
        </div>
      </div>

      {/* --- 2. Charts --- */}
      <div className="chart-grid">
        <div className="chart-container">
          <h3>Usage & Cost (Last 30 Days)</h3>
          {lineChartData ? <Line options={lineOptions} data={lineChartData} /> : <p>No line chart data.</p>}
        </div>
        
        <div className="chart-container doughnut-container">
          <h3>Total Ink Consumed (All Time, By Color)</h3>
          
          {/* --- THIS IS THE FIX --- */}
          {/* This wrapper div controls the chart size */}
          <div style={{ position: 'relative', height: '350px' }}>
            {doughnutData && doughnutData.datasets[0].data.length > 0 ? 
              <Doughnut data={doughnutData} options={doughnutOptions} /> : 
              <p>No ink consumption data found.</p>
            }
          </div>
          {/* --- END FIX --- */}
        </div>
      </div>

      {/* --- 3. NEW Predictive Forecast --- */}
      <div className="forecast-section">
        <h3>30-Day Ink Demand Forecast</h3>
        <p>Predicts your ink *demand* for the next 30 days (based on 90-day avg. burn rate) and compares it to your "Stock on Shelf".</p>
        {forecastData && Object.keys(forecastData).length > 0 ? (
          <div className="forecast-grid">
            {Object.entries(forecastData).map(([color, data]) => {
              const surplusAmount = (data.surplus / 1000).toFixed(2);
              
              return (
                <div className="forecast-card" key={color}>
                  <h4>{color} - 30 Day Outlook</h4>
                  <div className={`outlook-value ${data.statusClass}`}>
                    {surplusAmount} L
                  </div>
                  <div className={`outlook-status ${data.statusClass}`}>
                    Status: {data.statusText}
                  </div>
                  
                  <hr />
                  <p><strong>Est. Need (30 Days):</strong> {(data.forecastedNeed / 1000).toFixed(2)} L</p>
                  <p><strong>Stock on Shelf:</strong> {(data.stock / 1000).toFixed(2)} L</p>
                  <p><strong>Est. Burn Rate:</strong> {data.burnRate.toFixed(2)} ml/day</p>
                </div>
              )
            })}
          </div>
        ) : <p>No forecast data available. Start by linking your inks in the Printer Settings.</p>}
      </div>

    </div>
  );
};

export default DashboardPage;