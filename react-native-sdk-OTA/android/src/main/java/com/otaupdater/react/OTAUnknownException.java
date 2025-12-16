package com.otaupdater.react;

public class OTAUnknownException extends RuntimeException {
    public OTAUnknownException(String message) {
        super(message);
    }

    public OTAUnknownException(String message, Throwable cause) {
        super(message, cause);
    }
}

