import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apkAPI } from '../services/api';
import VersionCard from '../components/VersionCard';

function VersionList() {
  const navigate = useNavigate();
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterAppId, setFilterAppId] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    loadVersions();
  }, [filterAppId]);

  const loadVersions = async () => {
    try {
      setLoading(true);
      const response = await apkAPI.list(filterAppId || null);
      setVersions(response.data.versions);
      setError('');
    } catch (err) {
      setError('Failed to load versions. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!deleteConfirm || deleteConfirm !== id) {
      setDeleteConfirm(id);
      return;
    }

    try {
      await apkAPI.delete(id, false); // Don't delete files by default
      setDeleteConfirm(null);
      loadVersions();
    } catch (err) {
      setError('Failed to delete version. Please try again.');
      console.error(err);
    }
  };

  const handleDownload = async (id) => {
    try {
      const response = await apkAPI.download(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `app-${id}.apk`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download APK. Please try again.');
      console.error(err);
    }
  };

  const uniqueAppIds = [...new Set(versions.map(v => v.appId))];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => navigate('/dashboard')}
                className="text-sm text-indigo-600 hover:text-indigo-800 mb-2"
              >
                ← Back to Dashboard
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Version Management</h1>
            </div>
            <button
              onClick={() => navigate('/upload')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Upload New Version
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="mb-6 bg-white rounded-lg shadow-md p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex-1 max-w-xs">
              <label htmlFor="filterAppId" className="block text-sm font-medium text-gray-700 mb-1">
                Filter by App ID
              </label>
              <select
                id="filterAppId"
                value={filterAppId}
                onChange={(e) => setFilterAppId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All Apps</option>
                {uniqueAppIds.map(appId => (
                  <option key={appId} value={appId}>{appId}</option>
                ))}
              </select>
            </div>
            <div className="text-sm text-gray-600">
              Total Versions: {versions.length}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600">Loading versions...</p>
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-md">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No versions found</h3>
            <p className="mt-2 text-sm text-gray-600">
              Get started by uploading your first APK version.
            </p>
            <button
              onClick={() => navigate('/upload')}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Upload APK
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {versions.map(version => (
              <VersionCard
                key={version.id}
                version={version}
                onDelete={handleDelete}
                onDownload={handleDownload}
                isConfirming={deleteConfirm === version.id}
              />
            ))}
          </div>
        )}

        {/* Delete Confirmation Overlay */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Delete</h3>
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to delete this version? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default VersionList;

