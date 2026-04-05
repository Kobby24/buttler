import { useState } from "react";
import "./Home.css";
import { isAuthenticated, logoutUser,} from "../../utils/authUtils";
import { useNavigate } from "react-router-dom";

export default function TryOn() {
  const [userImage, setUserImage] = useState(null);
  const [userImageFile, setUserImageFile] = useState(null);
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [mannequin, setMannequin] = useState(null);
  const [error, setError] = useState("");

  const [clothesInput, setClothesInput] = useState("");
  const [clothesImage, setClothesImage] = useState("");
  const [clothesUrlValid, setClothesUrlValid] = useState(false);

  const [fitScore, setFitScore] = useState(null);
  const [size, setSize] = useState("");
  const [bodyType, setBodyType] = useState("");
  const [analysis, setAnalysis] = useState("");

  const [loading, setLoading] = useState(false);
  const [urlLoading, setUrlLoading] = useState(false);
  const [fitLoading, setFitLoading] = useState(false);

  const [mannequinLoading, setMannequinLoading] = useState(false);
  const [bodyDetails, setBodyDetails] = useState(null);

  const navigate = useNavigate();

  const handleLogout = () => {
    logoutUser();
      navigate(0);
  };

  const getBodyType = () => {
    const h = parseFloat(height);
    const w = parseFloat(weight);
    if (!h || !w) return null;
    const bmi = w / ((h / 100) ** 2);
    if (bmi < 18.5) return "skinny";
    if (bmi < 25) return "normal";
    return "fat";
  };

  const processImage = async (file) => {
    if (!file) return;

    const preview = URL.createObjectURL(file);
    setUserImage(preview);
    setUserImageFile(file);
    setLoading(true);
    setError("");
    setMannequin(null);
    setFitScore(null);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const validateRes = await fetch("http://127.0.0.1:5000/validate-person", {
        method: "POST",
        body: formData,
      });

      const validateData = await validateRes.json();

      if (!validateData.valid) {
        setError(validateData.message || "❌ No person detected in the photo");
        setUserImage(null);
        setUserImageFile(null);
        setLoading(false);
        return;
      }

      const processFormData = new FormData();
      processFormData.append("image", file);

      const processRes = await fetch("http://127.0.0.1:5000/process", {
        method: "POST",
        body: processFormData,
      });

      const processData = await processRes.json();

      if (processData.image) {
        setUserImage(`data:image/png;base64,${processData.image}`);
      }
    } catch (err) {
      console.error(err);
      setError("⚠️ Could not connect to server. Using original photo.");
    }

    setLoading(false);
  };

  const handleCreate = () => {
    if (loading) {
      setError("⏳ Photo is processing... please wait");
      return;
    }

    if (!isAuthenticated()) {
      setError(
        <span>
          Please create an account first.{" "}
          <span onClick={() => navigate("/signup")} style={{ color: "#c9a96e", cursor: "pointer", textDecoration: "underline" }}>
            Sign up
          </span>{" "}
          or{" "}
          <span onClick={() => navigate("/signin")} style={{ color: "#c9a96e", cursor: "pointer", textDecoration: "underline" }}>
            Sign in
          </span>
        </span>
      );
      return;
    }

    if (!userImage) {
      setError("📷 Please upload a photo first");
      return;
    }

    if (!height || !weight) {
      setError("📏 Please enter your height and weight");
      return;
    }

    const type = getBodyType();
    if (!type) return;

    setError("");
    setMannequin(`/models/${type}.png`);
  };

  const handleClothes = async () => {
    if (!clothesInput.trim()) {
      setError("🔗 Please paste a clothing link");
      return;
    }

    setUrlLoading(true);
    setError("");
    setClothesUrlValid(false);
    setClothesImage("");

    try {
      const res = await fetch("http://127.0.0.1:5000/validate-clothing-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: clothesInput }),
      });

      const data = await res.json();

      if (!data.valid) {
        setError(data.message || "❌ This is not a clothing link");
        setUrlLoading(false);
        return;
      }

      setClothesUrlValid(true);
      setClothesImage(clothesInput);
      setError("");
    } catch (err) {
      console.error(err);
      setError("⚠️ Could not validate URL. Please try again.");
    }

    setUrlLoading(false);
  };

  const calculateFit = async () => {
    if (!userImageFile) {
      setError("📷 A photo is required to calculate fit");
      return;
    }

    if (!height || !weight) {
      setError("📏 Height and weight are required");
      return;
    }

    if (!clothesUrlValid || !clothesInput) {
      setError("👗 Please load a valid clothing link first");
      return;
    }

    setFitLoading(true);
    setError("");
    setFitScore(null);

    try {
      const formData = new FormData();
      formData.append("image", userImageFile);
      formData.append("height", height);
      formData.append("weight", weight);
      formData.append("product_url", clothesInput);

      const res = await fetch("http://127.0.0.1:5000/check-fit", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.error) {
        setError(`❌ ${data.error}`);
        setFitLoading(false);
        return;
      }

      setFitScore(data.fit_score);
      setSize(data.size);
      setBodyType(data.body_type || "");
      setAnalysis(data.analysis || "");
    } catch (err) {
      console.error(err);
      setError("⚠️ Fit analysis failed. Please try again.");
    }

    setFitLoading(false);
  };

  

  return (
    <div className="home">
      {isAuthenticated() && (
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 24px" }}>
          
        </div>
      )}

      <div className="hero">
        <h1 >BUTTLER</h1>
        <p>See how clothes fit before you buy</p>
      </div>

      <div className="card">
        <label className="upload-box">
          <span>
            {loading ? "⏳ Processing photo..." : "📷 Upload your photo"}
          </span>
          <input
            type="file"
            hidden
            accept="image/*"
            onChange={(e) => e.target.files[0] && processImage(e.target.files[0])}
          />
        </label>

        {userImage && !loading && (
          <div style={{ textAlign: "center", marginTop: "8px" }}>
            <img
              src={userImage}
              alt="preview"
              style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "8px", border: "2px solid #c9a96e" }}
            />
            <p style={{ color: "#c9a96e", fontSize: "0.8rem", margin: "4px 0 0" }}>✅ Person detected</p>
          </div>
        )}

        <div className="inputs">
          <input
            placeholder="Height (cm)"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            type="number"
          />
          <input
            placeholder="Weight (kg)"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            type="number"
          />
        </div>

        <button className="create-btn" onClick={handleCreate} disabled={loading}>
          {loading ? "⏳ Processing..." : "Generate Mannequin"}
        </button>

        {error && (
          <p style={{ color: "#e05a5a", fontFamily: "'Jost', sans-serif", fontSize: "0.9rem", textAlign: "center", margin: 0 }}>
            {error}
          </p>
        )}
      </div>

      {mannequin && (
        <div className="preview">
          <div className="preview-box" style={{ position: "relative", overflow: "hidden" }}>
            <img src={mannequin} style={{ width: "100%", height: "100%", objectFit: "contain", position: "absolute" }} />
            {userImage && (
              <img src={userImage} style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover", opacity: 0.25 }} />
            )}
            {clothesImage && (
              <img src={clothesImage} style={{ position: "absolute", width: "100%", height: "100%", objectFit: "contain" }} />
            )}
          </div>

          <div className="clothes-box">
            <input
              placeholder="Paste clothing link (clothes only)"
              value={clothesInput}
              onChange={(e) => {
                setClothesInput(e.target.value);
                setClothesUrlValid(false);
                setClothesImage("");
              }}
            />
            <button onClick={handleClothes} disabled={urlLoading}>
              {urlLoading ? "⏳..." : "Load"}
            </button>
          </div>

          {clothesUrlValid && (
            <p style={{ color: "#6ec97a", fontFamily: "'Jost', sans-serif", fontSize: "0.85rem", textAlign: "center", margin: "4px 0" }}>
              ✅ Clothing link confirmed
            </p>
          )}

          <button className="create-btn" onClick={calculateFit} disabled={fitLoading}>
            {fitLoading ? "⏳ Analyzing..." : "Check Fit"}
          </button>

          {fitScore !== null && (
            <div className="result-box">
              <p>🔥 Fit Score: <strong>{fitScore}%</strong></p>
              <p>📏 Recommended Size: <strong>{size}</strong></p>
              {bodyType && <p>🧍 Body Type: <strong>{bodyType}</strong></p>}
              {analysis && (
                <p style={{ fontSize: "0.88rem", opacity: 0.85, marginTop: "8px", lineHeight: 1.5 }}>
                  💬 {analysis}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}