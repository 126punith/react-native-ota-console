package com.otaupdater.react;

public class OTAMalformedDataException extends RuntimeException {
    public OTAMalformedDataException(String message) {
        super(message);
    }

    public OTAMalformedDataException(String message, Throwable cause) {
        super(message, cause);
    }
}

