package ch.sysout.emubro.controller;

public class UpdateObject {
	private boolean applicationUpdateAvailable;
	private boolean signatureUpdateAvailable;
	private String applicationVersion;
	private String platformDetectionVersion;

	public UpdateObject(boolean applicationUpdateAvailable, boolean signatureUpdateAvailable,
			String applicationVersion, String platformDetectionVersion) {
		this.applicationUpdateAvailable = applicationUpdateAvailable;
		this.signatureUpdateAvailable = signatureUpdateAvailable;
		this.applicationVersion = applicationVersion;
		this.platformDetectionVersion = platformDetectionVersion;
	}

	public boolean isApplicationUpdateAvailable() {
		return applicationUpdateAvailable;
	}

	public boolean isSignatureUpdateAvailable() {
		return signatureUpdateAvailable;
	}

	public String getApplicationVersion() {
		return applicationVersion;
	}

	public String getPlatformDetectionVersion() {
		return platformDetectionVersion;
	}
}
