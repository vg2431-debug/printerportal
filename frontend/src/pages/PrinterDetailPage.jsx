import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { formatDateTime, calculateJobCost } from '../utils/formatters';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css'; // Import calendar CSS
import './PrinterDetailPage.css';

// --- Helper Functions ---

// 1 sq meter = 10.7639 sq feet
const SQM_TO_SQFT_CONVERSION = 10.7639;

// Creates a tooltip string for the calendar
const generateTooltip = (data, currency) => {
  let tip = `Jobs: ${data.count}\n`;
  tip += `Total Area: ${data.totalSqft.toFixed(2)} sqft\n`;
  tip += `Total Ink: ${data.totalInk.toFixed(2)} ml\n`;
  tip += `Total Cost: ${currency}${data.totalCost.toFixed(2)}\n`;
  tip += `--- Ink Details (ml) ---\n`;
  
  const colors = Object.keys(data.inkByColor).sort();
  for (const color of colors) {
    tip += `${color}: ${data.inkByColor[color].toFixed(2)} ml\n`;
  }
  return tip;
};

// --- Main Component ---

const PrinterDetailPage = () => {
  const { printerId } = useParams();
  const [printer, setPrinter] = useState(null);
  const [jobs, setJobs] = useState([]); // All jobs for this printer
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState(null);
  const [jobsError, setJobsError] = useState(null);
  
  // State for filtering
  const [selectedDate, setSelectedDate] = useState(null);
  
  const { settings, loading: settingsLoading } = useSettings();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setPageError(null);
        setJobsError(null);
        
        // Fetch printer details (full doc for cost calculation)
        const detailsResponse = await api.get(`/printers/${printerId}`);
        setPrinter(detailsResponse.data);

        // Fetch jobs (now sorted by backend)
        try {
          const jobsResponse = await api.get(`/jobs/by_printer/${printerId}`);
          setJobs(jobsResponse.data);
        } catch (err) {
          setJobsError('Failed to fetch the job list for this printer.');
        }

      } catch (err) {
        setPageError('Failed to fetch printer details.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [printerId]);

  // --- Memoized Calendar Data ---
  // This processes the job data for the calendar
  const calendarData = useMemo(() => {
    // Wait until all data is ready
    if (!jobs.length || !printer || !settings) {
      return {};
    }

    const data = {};
    for (const job of jobs) {
      if (!job.print_date) continue;
      
      const dateKey = job.print_date.split('T')[0]; // "YYYY-MM-DD"
      
      if (!data[dateKey]) {
        data[dateKey] = {
          count: 0,
          totalSqft: 0,
          totalInk: 0,
          totalCost: 0,
          inkByColor: {},
        };
      }
      
      const dayData = data[dateKey];
      // --- THIS IS THE BUG FIX ---
      // We must pass the single 'printer' object, not an array
      const jobCost = calculateJobCost(job, printer, settings);
      // --- END BUG FIX ---
      
      dayData.count += (job.copies || 1);
      dayData.totalSqft += (job.printed_area_sqm || 0) * SQM_TO_SQFT_CONVERSION;
      dayData.totalInk += (job.total_ink_ml || 0);
      dayData.totalCost += jobCost;
      
      // Aggregate ink by color
      if (job.ink_consumption_ml) {
        for (const [color, ml] of Object.entries(job.ink_consumption_ml)) {
           const c = color.toLowerCase();
           dayData.inkByColor[c] = (dayData.inkByColor[c] || 0) + ml;
        }
      }
    }
    return data;
  }, [jobs, printer, settings]);

  // --- Memoized Filtered Jobs ---
  // This list is shown in the table
  const filteredJobs = useMemo(() => {
    if (!selectedDate) {
      return jobs; // No filter, return all jobs
    }
    const filterKey = selectedDate.toLocaleDateString('en-CA'); // "YYYY-MM-DD"
    return jobs.filter(job => job.print_date && job.print_date.startsWith(filterKey));
  }, [jobs, selectedDate]);

  // Function to render calendar tiles
  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const dateKey = date.toLocaleDateString('en-CA'); // "YYYY-MM-DD"
      const data = calendarData[dateKey];
      
      if (data) {
        const currency = settings?.currency_symbol || '$';
        return (
          <div 
            className="calendar-job-count" 
            title={generateTooltip(data, currency)} // This creates the hover tooltip
          >
            {data.count}
          </div>
        );
      }
    }
    return null;
  };

  // Handle clicking a day
  const handleDateClick = (date) => {
    setSelectedDate(date);
  };
  
  // Get title for the job list
  const getJobListTitle = () => {
    if (selectedDate) {
      return `Printed Jobs on ${selectedDate.toLocaleDateString('en-GB')}`;
    }
    return "Printed Jobs - Recent";
  };


  // --- Render Logic ---
  if (loading || settingsLoading) {
    return <div>Loading printer data...</div>;
  }
  if (pageError) {
    return <div className="error">{pageError}</div>;
  }
  if (!printer) {
    return <div>Printer not found.</div>;
  }

  const currency = settings?.currency_symbol || "₹";

  return (
    <div className="printer-detail-page">
      
      <div className="printer-detail-header">
        <div className="printer-header">
          <h2>{printer.printer_name}</h2>
          <p>{printer.brand} {printer.model} ({printer.serial_number})</p>
          <p><strong>Location:</strong> {printer.location}</p>
          <p><strong>Inks:</strong> {printer.inks.join(', ')}</p>
        </div>
        
        <div className="calendar-container">
          <Calendar
            tileContent={tileContent}
            onClickDay={handleDateClick}
            value={selectedDate}
            maxDate={new Date()}
          />
        </div>
      </div>

      {/* --- Job List Header --- */}
      <div className="job-list-header">
        <h3>{getJobListTitle()}</h3>
        {selectedDate && (
          <button onClick={() => setSelectedDate(null)}>
            Show All Jobs
          </button>
        )}
      </div>
      
      {jobsError ? (
        <div className="error">{jobsError}</div>
      ) : jobs.length === 0 ? (
        <p>No jobs have been uploaded for this printer yet.</p>
      ) : filteredJobs.length === 0 ? (
        <p>No jobs found for the selected date.</p>
      ) : (
        <table className="jobs-table">
          <thead>
            <tr>
              <th>Job Name</th>
              <th>Print Date</th>
              <th>Resolution (DPI)</th>
              <th>Dimensions (mm)</th>
              <th>Copies</th>
              <th>Ink Cost</th>
            </tr>
          </thead>
          <tbody>
            {/* Map over 'filteredJobs' */}
            {filteredJobs.map((job) => {
              // Pass the single 'printer' object
              const cost = calculateJobCost(job, printer, settings);
              
              return (
                <tr key={job.id}>
                  <td>
                    <Link to={`/jobs/${job.id}`}>{job.job_name}</Link>
                  </td>
                  <td>{formatDateTime(job.print_date)}</td>
                  <td>{job.dpi_x} x {job.dpi_y}</td>
                  <td>{job.width_mm.toFixed(1)} x {job.length_mm.toFixed(1)}</td>
                  <td>{job.copies}</td>
                  <td>{currency}{cost.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default PrinterDetailPage;