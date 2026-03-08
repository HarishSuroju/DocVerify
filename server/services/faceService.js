const buildFaceApiBase = () => {
  const endpoint = process.env.AZURE_FACE_API_ENDPOINT;
  if (!endpoint) throw new Error("AZURE_FACE_API_ENDPOINT is not configured");
  const normalized = endpoint.replace(/\/+$/, "");
  return normalized.replace(/\/face\/v1\.0$/i, "");
};

const getFaceApiKey = () => {
  const key = process.env.AZURE_FACE_API_KEY;
  if (!key) throw new Error("AZURE_FACE_API_KEY is not configured");
  return key;
};

const requestJson = async (url, payload) => {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Ocp-Apim-Subscription-Key": getFaceApiKey(),
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const detail = data?.error?.message || data?.message || text || `HTTP ${res.status}`;
    throw new Error(`Face API request failed: ${detail}`);
  }

  return data;
};

const detectFace = async (imageUrl) => {
  const base = buildFaceApiBase();
  const url = `${base}/face/v1.0/detect?returnFaceId=true`;
  const result = await requestJson(url, { url: imageUrl });
  if (!Array.isArray(result) || !result.length || !result[0].faceId) {
    throw new Error("Face not detected in one or both images");
  }
  return result[0].faceId;
};

async function matchFaces(profileUrl, liveUrl) {
  const base = buildFaceApiBase();
  const [faceId1, faceId2] = await Promise.all([detectFace(profileUrl), detectFace(liveUrl)]);

  const verifyUrl = `${base}/face/v1.0/verify`;
  const result = await requestJson(verifyUrl, { faceId1, faceId2 });

  return { isIdentical: Boolean(result?.isIdentical), confidence: Number(result?.confidence || 0) };
}

module.exports = { matchFaces };
