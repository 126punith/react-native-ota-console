package com.otaupdater.react;

public class OTAInvalidUpdateException extends RuntimeException {
    public OTAInvalidUpdateException(String message) {
        super(message);
    }

    public OTAInvalidUpdateException(String message, Throwable cause) {
        super(message, cause);
    }
}

