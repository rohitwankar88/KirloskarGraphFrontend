import { useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";

// Import images
import KRS4115 from "/assets/KRS4115.png";
import KRS4133 from "/assets/KRS4133.png";
import KRS4150 from "/assets/KRS4150.png";
import KRS4170 from "/assets/KRS4170.png";
import KRS4195 from "/assets/KRS4195.png";
import KRS4225 from "/assets/KRS4225.png";
import KRS3145 from "/assets/KRS3145.png";
import KRS3165 from "/assets/KRS3165.png";
import KRS3193 from "/assets/KRS3193.png";

const backend_url = `${import.meta.env.VITE_BACKEND_API_URL}/process`;
const economizer_url = "http://127.0.0.1:5000/plot_economizer";

const modelImages = {
  KRS4115,
  KRS4133,
  KRS4150,
  KRS4170,
  KRS4195,
  KRS4225,
  KRS3145,
  KRS3165,
  KRS3193,
};

export default function CompressorForm() {
  const [formData, setFormData] = useState({
    model: "KRS4115",
    refrigerant: "Ammonia",
    evap_temp: 10.0,
    cond_temp: 30.0,
    superheat: 0.0,
    speed: 2980,
  });

  const [results, setResults] = useState(null);
  const [error, setError] = useState("");

  // ✅ Handle input changes
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: parseFloat(e.target.value) || e.target.value,
    });
  };

  // ✅ Submit form and fetch results
  const handleSubmit = async () => {
    try {
      const res = await axios.post(backend_url, formData);
      if (res.data.error) {
        setError(res.data.error);
        setResults(null);
      } else {
        setResults(res.data);
        setError("");
      }
    } catch (err) {
      setError("Failed to connect to backend");
    }
  };

  // ✅ Map input keys to display labels
  const inputLabels = {
    model: "Compressor Model",
    refrigerant: "Refrigerant",
    evap_temp: "Evaporation Temperature (°C)",
    cond_temp: "Condenser Temperature (°C)",
    superheat: "Superheat (°C)",
    speed: "Speed (RPM)",
  };

  // ✅ Fields always taken from input
  const forceInputFields = [
    "Evaporation Temperature (°C)",
    "Condenser Temperature (°C)",
    "Superheat (°C)",
    "Speed (RPM)",
  ];

  // ✅ Exclude these fields from results
  const excludeFields = ["h1", "h2", "h3"];

  // ✅ Get all unique fields
  const getAllFields = () => {
    const apiKeys = results ? Object.keys(results) : [];
    const inputKeys = Object.keys(formData).map((k) => inputLabels[k] || k);

    return Array.from(new Set([...apiKeys, ...inputKeys])).filter(
      (key) => !excludeFields.includes(key)
    );
  };

  // ✅ Get display value for each field
  const getFieldValue = (key) => {
    if (forceInputFields.includes(key)) {
      const originalKey = Object.keys(inputLabels).find(
        (k) => inputLabels[k] === key
      );
      return formData[originalKey]?.toFixed(2) ?? "-";
    }

    const apiValue = results?.[key];
    if (apiValue !== undefined && apiValue !== null) {
      return typeof apiValue === "number" ? apiValue.toFixed(2) : apiValue;
    }

    const inputKey = Object.keys(inputLabels).find(
      (k) => inputLabels[k] === key
    );
    const inputValue = formData[inputKey];
    return inputValue !== undefined && inputValue !== null
      ? typeof inputValue === "number"
        ? inputValue.toFixed(2)
        : inputValue
      : "-";
  };

  // ✅ Generate PDF with formatted fields
  const generatePDF = () => {
    const pdf = new jsPDF("p", "mm", "a4");
    const margin = 15;
    let y = margin;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.text(
      "Khione Compressor Analysis Results",
      pdf.internal.pageSize.getWidth() / 2,
      y,
      { align: "center" }
    );

    y += 10;
    const model = results?.["Compressor Model"] || formData.model;
    const image = modelImages[model];

    if (image) {
      const img = new Image();
      img.src = image;
      img.onload = () => {
        const imgWidth = 60;
        const imgHeight = (img.height / img.width) * imgWidth;
        pdf.addImage(
          img,
          "PNG",
          (pdf.internal.pageSize.getWidth() - imgWidth) / 2,
          y,
          imgWidth,
          imgHeight
        );
        y += imgHeight + 10;

        pdf.setFontSize(12);
        pdf.setFont("helvetica", "normal");

        getAllFields().forEach((key) => {
          const value = getFieldValue(key);
          pdf.text(`${key}: ${value}`, margin, y);
          y += 7;
        });

        pdf.save("Khione_Compressor_Analysis_Results.pdf");
      };
    } else {
      y += 10;
      getAllFields().forEach((key) => {
        const value = getFieldValue(key);
        pdf.text(`${key}: ${value}`, margin, y);
        y += 7;
      });
      pdf.save("Khione_Compressor_Analysis_Results.pdf");
    }
  };


  // Download PH-Graph Diagram
const getPHDiagramImage = async () => {
    try {
    // Step 1: Call /process to get full result
    const processRes = await axios.post(backend_url, formData);
    if (processRes.data.error) {
      alert("Error from /process API: " + processRes.data.error);
      return;
    }

    const fullData = processRes.data; // This has h1, h2, h3, pressures, etc.

    // Step 2: Call /plot_economizer with fullData
    const econRes = await axios.post(`${import.meta.env.VITE_BACKEND_API_URL}/plot`, fullData);

    if (econRes.data?.ph_diagram) {
      const base64Data = econRes.data.ph_diagram;
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);

      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }

      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "image/jpeg" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${formData.model}_PH_Graph_Diagram.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      alert("No PH-Graph image found in API response.");
    }
  } catch (error) {
    console.error("Error fetching PH-Graph:", error);
    alert("Something went wrong while generating PH-Graph.");
  } };
  // ✅ Download PH-Graph Economizer
const getEconomizerImage = async () => {
  try {
    // Step 1: Call /process to get full result
    const processRes = await axios.post(backend_url, formData);
    if (processRes.data.error) {
      alert("Error from /process API: " + processRes.data.error);
      return;
    }

    const fullData = processRes.data; // This has h1, h2, h3, pressures, etc.

    // Step 2: Call /plot_economizer with fullData
    const econRes = await axios.post(`${import.meta.env.VITE_BACKEND_API_URL}/plot_economizer`, fullData);

    if (econRes.data?.ph_diagram_economizer) {
      const base64Data = econRes.data.ph_diagram_economizer;
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);

      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }

      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "image/jpeg" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${formData.model}_PH_Graph_Economizer.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      alert("No PH-Graph Economizer image found in API response.");
    }
  } catch (error) {
    console.error("Error fetching PH-Graph Economizer:", error);
    alert("Something went wrong while generating PH-Graph Economizer.");
  }
};


  // ✅ Download Drawing & Manual PDFs
  const downloadMDPDF = async (model, folder, event) => {
    const button = event.target;
    const originalText = button.innerText;

    try {
      button.innerText = "Downloading...";
      button.disabled = true;

      const path = `/assets/${model}_${folder}.pdf`;
      const response = await fetch(path);

      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${model}_${folder}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
      alert("Download failed. Make sure the PDF exists and try again.");
    } finally {
      button.innerText = originalText;
      button.disabled = false;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input Form */}
        <div className="bg-white p-6 rounded shadow">
          <h2 className="text-xl font-bold mb-4 text-blue-800">
            Enter Compressor Parameters
          </h2>

          <label>Compressor Model</label>
          <select
            name="model"
            className="w-full p-2 mb-2 border rounded"
            value={formData.model}
            onChange={handleChange}
          >
            {Object.keys(modelImages).map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>

          <label>Refrigerant</label>
          <select
            name="refrigerant"
            className="w-full p-2 mb-2 border rounded"
            value={formData.refrigerant}
            onChange={handleChange}
          >
            {["Ammonia", "R134a", "R404A", "R410A", "R1234yf", "CO2"].map(
              (r) => (
                <option key={r}>{r}</option>
              )
            )}
          </select>

          <label>Evaporation Temperature (°C)</label>
          <input
            name="evap_temp"
            type="number"
            className="w-full p-2 mb-2 border rounded"
            value={formData.evap_temp}
            onChange={handleChange}
          />

          <label>Condenser Temperature (°C)</label>
          <input
            name="cond_temp"
            type="number"
            className="w-full p-2 mb-2 border rounded"
            value={formData.cond_temp}
            onChange={handleChange}
          />

          <label>Superheat (°C)</label>
          <input
            name="superheat"
            type="number"
            className="w-full p-2 mb-2 border rounded"
            value={formData.superheat}
            onChange={handleChange}
          />

          <label>Speed (RPM)</label>
          <input
            name="speed"
            type="number"
            className="w-full p-2 mb-4 border rounded"
            value={formData.speed}
            onChange={handleChange}
          />

          <button
            onClick={handleSubmit}
            className="bg-blue-600 text-white w-full p-2 rounded hover:bg-blue-700"
          >
            Calculate
          </button>

          {error && (
            <p className="text-red-500 mt-4 font-semibold text-center">{error}</p>
          )}
        </div>

        {/* Output Section */}
        <div className="bg-white p-6 rounded shadow mt-6 md:mt-0">
          <h2 className="text-xl font-bold text-blue-800 mb-4">
            Khione Compressor Analysis Results
          </h2>

          {results && (
            <>
              {results["Compressor Model"] &&
                modelImages[results["Compressor Model"]] && (
                  <div className="flex justify-center mb-4">
                    <img
                      src={modelImages[results["Compressor Model"]]}
                      alt={results["Compressor Model"]}
                      className="h-40 object-contain"
                    />
                  </div>
                )}

              <div className="bg-gray-50 p-4 rounded shadow-inner mb-4">
                {getAllFields().map((key) => (
                  <div
                    key={key}
                    className="flex justify-between border-b py-2 last:border-b-0"
                  >
                    <span className="font-semibold text-gray-700">{key}:</span>
                    <span>{getFieldValue(key)}</span>
                  </div>
                ))}
              </div>

              <div className="text-center flex gap-3">
                <button
                  onClick={generatePDF}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded"
                >
                  Download the Generated Result
                </button>
                <button
                  onClick={getEconomizerImage}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded"
                >
                  Get PH-Graph Economizer
                </button>
                <button
                  onClick={getPHDiagramImage}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded"
                >
                  Get PH-Graph Diagram
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Technical Data Section */}
      <div className="bg-white p-6 rounded shadow mt-6">
        <h3 className="text-lg font-bold mb-3">Technical Data:</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span>Model - {formData.model}</span>
            <button
              onClick={(e) => downloadMDPDF(formData.model, "Dr", e)}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400 transition-colors"
            >
              Download Drawing
            </button>
            <button
              onClick={(e) => downloadMDPDF(formData.model, "MA", e)}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400 transition-colors"
            >
              Download Manual
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
