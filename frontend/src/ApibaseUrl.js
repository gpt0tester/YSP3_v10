const getApiBaseUrl = () => {
  return `${window.location.protocol}//${window.location.hostname}:5000/api`;
};

const ApibaseUrl =
  window.env?.REACT_APP_API_BASE_URL ||
  getApiBaseUrl() ||
  process.env.REACT_APP_API_BASE_URL;

export default ApibaseUrl;
