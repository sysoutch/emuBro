package ch.sysout.emubro.controller;

public class UpdateObject {
	private boolean applicationUpdateAvailable;
	private boolean signatureUpdateAvailable;
	private String applicationVersion;
	private String platformDetectionVersion;
	private String downloadLink;

	public UpdateObject(boolean applicationUpdateAvailable, boolean signatureUpdateAvailable,
			String applicationVersion, String platformDetectionVersion, String downloadLink) {
		this.applicationUpdateAvailable = applicationUpdateAvailable;
		this.signatureUpdateAvailable = signatureUpdateAvailable;
		this.applicationVersion = applicationVersion;
		this.platformDetectionVersion = platformDetectionVersion;
		this.downloadLink = downloadLink;
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

	public String getDownloadLink() {
		return downloadLink;
	}
}
