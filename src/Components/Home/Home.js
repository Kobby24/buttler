import { useState, useMemo, useEffect } from "react";
import "./Home.css";
import { isAuthenticated, logoutUser,} from "../../utils/authUtils";
import { useNavigate } from "react-router-dom";

export default function TryOn() {
  const [userImage, setUserImage] = useState(null);
  const [userImageFile, setUserImageFile] = useState(null);
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [error, setError] = useState("");

  const [clothesInput, setClothesInput] = useState("");
  const [clothesImage, setClothesImage] = useState("");
  const [clothesUrlValid, setClothesUrlValid] = useState(false);

  const [fitScore, setFitScore] = useState(null);
  const [size, setSize] = useState("");
  const [bodyType, setBodyType] = useState("");
  const [analysis, setAnalysis] = useState("");

  const [uploadProcessing, setUploadProcessing] = useState(false);
  const [urlLoading, setUrlLoading] = useState(false);
  const [fitLoading, setFitLoading] = useState(false);
  const [generatedMannequinPath, setGeneratedMannequinPath] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    setGeneratedMannequinPath(null);
  }, [height, weight]);

  const getBodyCategory = (heightCm, weightKg) => {
    const h = parseFloat(heightCm);
    const w = parseFloat(weightKg);
    if (!h || h <= 0 || !w || w <= 0) return null;

    const bmi = w / ((h / 100) ** 2);

    if (bmi < 18.5) {
      return "skinny";
    }
    if (bmi < 25) {
      return "normal";
    }
    return "fat";
  };

  const bodyCategory = useMemo(() => getBodyCategory(height, weight), [height, weight]);
  const mannequinPath = bodyCategory ? `/models/${bodyCategory}.png` : null;

  const handleLogout = () => {
    logoutUser();
      navigate(0);
  };

  const processImage = async (file) => {
    if (!file) return;

    const blobUrl = URL.createObjectURL(file);
    setUserImage(blobUrl);
    setUserImageFile(file);
    setUploadProcessing(true);
    setError("");
    setFitScore(null);
    setGeneratedMannequinPath(null);

    const timeoutMs = 90000;
    let fetchSignal = undefined;
    let fetchTimeoutId;
    if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
      fetchSignal = AbortSignal.timeout(timeoutMs);
    } else {
      const ctrl = new AbortController();
      fetchSignal = ctrl.signal;
      fetchTimeoutId = setTimeout(() => ctrl.abort(), timeoutMs);
    }

    try {
      const formData = new FormData();
      formData.append("image", file);

      const validateRes = await fetch("http://127.0.0.1:5000/validate-person", {
        method: "POST",
        body: formData,
        signal: fetchSignal,
      });

      let validateData;
      try {
        validateData = await validateRes.json();
      } catch {
        throw new Error("Invalid response from server");
      }

      if (!validateData.valid) {
        URL.revokeObjectURL(blobUrl);
        setUserImage(null);
        setUserImageFile(null);
        setError(validateData.message || "❌ No person detected in the photo");
        return;
      }

      const processFormData = new FormData();
      processFormData.append("image", file);

      const processRes = await fetch("http://127.0.0.1:5000/process", {
        method: "POST",
        body: processFormData,
        signal: fetchSignal,
      });

      const processData = await processRes.json().catch(() => ({}));

      if (processData.image) {
        URL.revokeObjectURL(blobUrl);
        setUserImage(`data:image/png;base64,${processData.image}`);
      } else if (processData.error) {
        setError(`⚠️ Background removal failed: ${processData.error}. Using your original photo.`);
      }
    } catch (err) {
      console.error(err);
      if (err.name === "TimeoutError" || err.name === "AbortError") {
        setError(
          "⚠️ Server took too long (API or rembg). Your photo is kept — you can use Generate below, or restart ai-server."
        );
      } else {
        setError("⚠️ Could not reach server. Your photo is kept — check that ai-server is running on port 5000.");
      }
    } finally {
      if (fetchTimeoutId) clearTimeout(fetchTimeoutId);
      setUploadProcessing(false);
    }
  };

  const handleGenerate = () => {
    if (uploadProcessing) {
      setError("⏳ Photo is still uploading to the server — wait a moment.");
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

    if (!mannequinPath) {
      setError("📏 Enter valid height (cm) and weight (kg)");
      return;
    }

    setError("");
    setGeneratedMannequinPath(mannequinPath);
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
        <label className={`upload-box${uploadProcessing ? " upload-box--busy" : ""}`}>
          <span>
            {uploadProcessing ? "⏳ Processing photo..." : "📷 Upload your photo"}
          </span>
          <input
            type="file"
            hidden
            disabled={uploadProcessing}
            accept="image/*"
            onChange={(e) => e.target.files[0] && processImage(e.target.files[0])}
          />
        </label>

        {userImage && (
          <div className="card-photo-thumb">
            <img src={userImage} alt="Uploaded preview" />
            <p className="card-photo-thumb-caption">
              {uploadProcessing ? "⏳ Checking / processing…" : "✅ Person detected"}
            </p>
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

        {userImage && !bodyCategory && (height || weight) && (
          <p style={{ color: "rgba(240, 236, 228, 0.5)", fontFamily: "'Jost', sans-serif", fontSize: "0.85rem", textAlign: "center", margin: 0 }}>
            📏 Enter valid height (cm) and weight (kg), then click Generate Mannequin.
          </p>
        )}

        {userImage && bodyCategory && !isAuthenticated() && (
          <p style={{ color: "#c9a96e", fontFamily: "'Jost', sans-serif", fontSize: "0.85rem", textAlign: "center", margin: 0 }}>
            <span>
              Sign in and click Generate to load the mannequin.{" "}
              <span onClick={() => navigate("/signin")} style={{ cursor: "pointer", textDecoration: "underline" }}>
                Sign in
              </span>
            </span>
          </p>
        )}

        {userImage && bodyCategory && isAuthenticated() && (
          <p style={{ color: "#c9a96e", fontFamily: "'Jost', sans-serif", fontSize: "0.85rem", textAlign: "center", margin: 0 }}>
            {bodyCategory === "skinny" && "🧍 Body: slim (BMI under 18.5)"}
            {bodyCategory === "normal" && "🧍 Body: average (BMI 18.5–24.9)"}
            {bodyCategory === "fat" && "🧍 Body: larger (BMI 25+)"}
          </p>
        )}

        <button className="create-btn" type="button" onClick={handleGenerate} disabled={uploadProcessing || !userImage}>
          Generate Mannequin
        </button>

        {error && (
          <p style={{ color: "#e05a5a", fontFamily: "'Jost', sans-serif", fontSize: "0.9rem", textAlign: "center", margin: 0 }}>
            {error}
          </p>
        )}
      </div>

      {userImage && (
        <div className="preview">
          <div className="preview-row">
            <div className="preview-panel">
              <span className="preview-panel-label">Your photo</span>
              <div className="preview-box preview-box--photo">
                <img src={userImage} alt="Your upload" className="preview-box-photo-img" />
              </div>
            </div>
            <div className="preview-panel">
              <span className="preview-panel-label">Mannequin</span>
              <div className="preview-box preview-box--mannequin">
                {generatedMannequinPath ? (
                  <>
                    <img
                      src={generatedMannequinPath}
                      alt="Mannequin"
                      className="preview-mannequin-base"
                    />
                    {clothesImage && (
                      <img
                        src={clothesImage}
                        alt="Clothing"
                        className="preview-mannequin-layer--clothes"
                      />
                    )}
                  </>
                ) : (
                  <span className="preview-box-placeholder">
                    {isAuthenticated() && mannequinPath
                      ? "Click Generate Mannequin"
                      : isAuthenticated()
                        ? "Enter height & weight"
                        : "Sign in, then generate"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {isAuthenticated() && generatedMannequinPath && (
            <>
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
            </>
          )}
        </div>
      )}
    </div>
  );
}