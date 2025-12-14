function VersionCard({ version, onDelete, onDownload }) {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getUpdateTypeColor = (type) => {
    return type === 'major' 
      ? 'bg-red-100 text-red-800 border-red-200' 
      : 'bg-blue-100 text-blue-800 border-blue-200';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{version.versionName}</h3>
          <p className="text-sm text-gray-600">Version Code: {version.versionCode}</p>
        </div>
        <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getUpdateTypeColor(version.updateType)}`}>
          {version.updateType === 'major' ? 'Major' : 'Minor'}
        </span>
      </div>

      <div className="mb-4">
        <p className="text-sm font-medium text-gray-700 mb-1">App ID:</p>
        <p className="text-sm text-gray-600 font-mono">{version.appId}</p>
      </div>

      {version.releaseNotes && (
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-1">Release Notes:</p>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{version.releaseNotes}</p>
        </div>
      )}

      <div className="flex justify-between items-center pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Created: {formatDate(version.createdAt)}
        </p>
        <div className="flex space-x-2">
          {onDownload && (
            <button
              onClick={() => onDownload(version.id)}
              className="px-3 py-1 text-sm text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-md transition-colors"
            >
              Download
            </button>
          )}
          <button
            onClick={() => onDelete(version.id)}
            className="px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default VersionCard;

