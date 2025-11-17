import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { formatDateTime, calculateJobCost } from '../utils/formatters';
import './JobDetailPage.css';

const INK_COLORS = {
  cyan: '#00bcd4',
  magenta: '#e91e63',
  yellow: '#ffeb3b',
  black: '#000000',
  red: '#f44336',
  green: '#4caf50',
  'light cyan': '#80deea',
  'light black': '#424242',
  white: '#ffffff',
  varnish: '#795548',
};

const JobDetailPage = () => {
  const { jobId } = useParams();
  const [job, setJob] = useState(null);
  const [printer, setPrinter] = useState(null); // <-- Need printer for costs
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { settings, loading: settingsLoading } = useSettings();

  useEffect(() => {
    const fetchJobAndPrinter = async () => {
      try {
        setLoading(true);
        // 1. Fetch the job
        const jobResponse = await api.get(`/jobs/${jobId}`);
        const jobData = jobResponse.data;
        setJob(jobData);
        
        // 2. Fetch the job's printer (for ink costs)
        if (jobData.printer_id) {
          const printerResponse = await api.get(`/printers/${jobData.printer_id}`);
          setPrinter(printerResponse.data);
        } else {
          throw new Error("Job has no printer ID.");
        }
      } catch (err) {
        setError("Failed to fetch job details.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchJobAndPrinter();
  }, [jobId]);

  // Wait for job, printer, and settings
  if (loading || settingsLoading || !job || !printer) {
    return <div>Loading job details...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  const jobCost = calculateJobCost(job, printer, settings);
  const currency = settings?.currency_symbol || "₹";

  return (
    <div className="job-detail-page">
      <Link to={`/printers/${job.printer_id}`}>&larr; Back to {printer.printer_name}</Link>
      
      <div className="job-header">
        <h2>{job.job_name}</h2>
        <div className="job-cost">
          Total Ink Cost: <span>{currency}{jobCost.toFixed(2)}</span>
        </div>
      </div>
      
      <div className="job-details-grid">
        <div className="detail-card">
          <h4>Job Info</h4>
          <p><strong>Print Date:</strong> {formatDateTime(job.print_date)}</p>
          <p><strong>Copies:</strong> {job.copies}</p>
          <p><strong>Status:</strong> {job.job_status}</p>
        </div>
        
        <div className="detail-card">
          <h4>Dimensions & Media</h4>
          <p><strong>Dimensions (mm):</strong> {job.width_mm} x {job.length_mm}</p>
          <p><strong>Area (m²)      :</strong> {job.printed_area_sqm.toFixed(2)}</p>
          <p><strong>Length (m)     :</strong> {job.printed_length_m.toFixed(2)}</p>
        </div>
        
        <div className="detail-card">
          <h4>Print Settings</h4>
          <p><strong>Resolution:</strong> {job.dpi_x} x {job.dpi_y} DPI</p>
          <p><strong>Print Mode:</strong> {job.print_mode}</p>
          <p><strong>Speed:</strong> {job.speed}</p>
          <p><strong>Pass:</strong> {job.printed_pass}</p>
        </div>
  <div className="detail-card">
  <h4>Ink Consumption</h4>
  <p>
    <strong>Total Ink:</strong> {job.total_ink_ml.toFixed(2)} ml
  </p>

  <ul className="ink-list">
    {Object.entries(job.ink_consumption_ml).map(([color, ml]) => {
      const total = job.total_ink_ml || 1;
      const percent = (ml / total) * 100;
      const barColor = INK_COLORS[color.toLowerCase()] || "#666";

      return (
        <li key={color} className="ink-item">
          {/* FLEX ROW ONLY INSIDE */}
          <div className="ink-row">
            <span className="ink-label">{color}</span>

            <div className="ink-bar-track">
              <div
                className="ink-bar-fill"
                style={{
                  width: `${percent}%`,
                  backgroundColor: barColor,
                }}
              />
            </div>

            <span className="ink-ml">{ml.toFixed(2)} ml</span>
          </div>
        </li>
      );
    })}
  </ul>
</div>


      </div>
    </div>
  );
};

export default JobDetailPage;