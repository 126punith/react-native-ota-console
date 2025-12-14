import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ApkUploader from '../components/ApkUploader';
import { apkAPI } from '../services/api';

function UploadApk() {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [formData, setFormData] = useState({
    appId: '',
    versionName: '',
    versionCode: '',
    updateType: 'major',
    releaseNotes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleFileSelect = (file) => {
    setSelectedFile(file);
    setError('');
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedFile) {
      setError('Please select an APK file');
      return;
    }

    setLoading(true);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('apk', selectedFile);
      uploadFormData.append('appId', formData.appId);
      uploadFormData.append('versionName', formData.versionName);
      uploadFormData.append('versionCode', formData.versionCode);
      uploadFormData.append('updateType', formData.updateType);
      uploadFormData.append('releaseNotes', formData.releaseNotes);

      await apkAPI.upload(uploadFormData);
      
      setSuccess('APK uploaded successfully!');
      setTimeout(() => {
        navigate('/versions');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Upload failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => navigate('/dashboard')}
                className="text-sm text-indigo-600 hover:text-indigo-800 mb-2"
              >
                ← Back to Dashboard
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Upload APK</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              APK File
            </label>
            <ApkUploader onFileSelect={handleFileSelect} selectedFile={selectedFile} />
            {error && selectedFile && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
          </div>

          {/* App ID */}
          <div>
            <label htmlFor="appId" className="block text-sm font-medium text-gray-700 mb-1">
              App ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="appId"
              name="appId"
              value={formData.appId}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="com.example.myapp"
            />
            <p className="mt-1 text-xs text-gray-500">Unique identifier for your app</p>
          </div>

          {/* Version Name */}
          <div>
            <label htmlFor="versionName" className="block text-sm font-medium text-gray-700 mb-1">
              Version Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="versionName"
              name="versionName"
              value={formData.versionName}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="1.0.0"
            />
            <p className="mt-1 text-xs text-gray-500">Semantic version (e.g., 1.0.0, 2.1.3)</p>
          </div>

          {/* Version Code */}
          <div>
            <label htmlFor="versionCode" className="block text-sm font-medium text-gray-700 mb-1">
              Version Code <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="versionCode"
              name="versionCode"
              value={formData.versionCode}
              onChange={handleChange}
              required
              min="1"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="100"
            />
            <p className="mt-1 text-xs text-gray-500">Integer version code (must be incrementing)</p>
          </div>

          {/* Update Type */}
          <div>
            <label htmlFor="updateType" className="block text-sm font-medium text-gray-700 mb-1">
              Update Type <span className="text-red-500">*</span>
            </label>
            <select
              id="updateType"
              name="updateType"
              value={formData.updateType}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="major">Major Update (Full APK Installation)</option>
              <option value="minor">Minor Update (JS Bundle Update)</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Major: Full APK installation required. Minor: JavaScript bundle update only.
            </p>
          </div>

          {/* Release Notes */}
          <div>
            <label htmlFor="releaseNotes" className="block text-sm font-medium text-gray-700 mb-1">
              Release Notes
            </label>
            <textarea
              id="releaseNotes"
              name="releaseNotes"
              value={formData.releaseNotes}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="What's new in this version..."
            />
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
              {error}
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-md">
              {success}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedFile}
              className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Uploading...' : 'Upload APK'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default UploadApk;

