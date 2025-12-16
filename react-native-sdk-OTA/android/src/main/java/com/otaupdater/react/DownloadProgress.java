package com.otaupdater.react;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;

public class DownloadProgress {
    private long mTotalBytes;
    private long mReceivedBytes;

    public DownloadProgress(long totalBytes, long receivedBytes) {
        mTotalBytes = totalBytes;
        mReceivedBytes = receivedBytes;
    }

    public boolean isCompleted() {
        return mTotalBytes == mReceivedBytes;
    }

    public WritableMap createWritableMap() {
        WritableMap map = Arguments.createMap();
        map.putDouble("totalBytes", mTotalBytes);
        map.putDouble("receivedBytes", mReceivedBytes);
        return map;
    }
}

