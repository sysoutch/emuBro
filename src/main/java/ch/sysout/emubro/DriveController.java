package ch.sysout.emubro;

import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.util.Collections;

import com.google.api.client.auth.oauth2.Credential;
import com.google.api.client.extensions.java6.auth.oauth2.AuthorizationCodeInstalledApp;
import com.google.api.client.extensions.jetty.auth.oauth2.LocalServerReceiver;
import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeFlow;
import com.google.api.client.googleapis.auth.oauth2.GoogleClientSecrets;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.googleapis.media.MediaHttpDownloader;
import com.google.api.client.googleapis.media.MediaHttpDownloaderProgressListener;
import com.google.api.client.googleapis.media.MediaHttpUploader;
import com.google.api.client.googleapis.media.MediaHttpUploaderProgressListener;
import com.google.api.client.http.FileContent;
import com.google.api.client.http.HttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.jackson2.JacksonFactory;
import com.google.api.client.util.store.DataStoreFactory;
import com.google.api.client.util.store.FileDataStoreFactory;
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.DriveScopes;
import com.google.api.services.drive.model.File;

public class DriveController {

	/**
	 * Be sure to specify the name of your application. If the application name is {@code null} or
	 * blank, the application will log a warning. Suggested format is "MyCompany-ProductName/1.0".
	 */
	static final String APPLICATION_NAME = "sysout-emuBro/1.0";
	static final String DRIVE_FOLDER_NAME = "emuBro";
	static final String UPLOAD_FILE_PATH = System.getProperty("user.dir") + "/" + "emubro-resources/themes/jamaica/theme.json";
	static final String DIR_FOR_DOWNLOADS = System.getProperty("user.dir") + "/downloads";
	static final java.io.File UPLOAD_FILE = new java.io.File(UPLOAD_FILE_PATH);
	/** Directory to store user credentials. */
	static final java.io.File DATA_STORE_DIR =
			new java.io.File(System.getProperty("user.home"), ".emuBro/store/drive");
	/**
	 * Global instance of the {@link DataStoreFactory}. The best practice is to make it a single
	 * globally shared instance across your application.
	 */
	private static FileDataStoreFactory dataStoreFactory;
	/** Global instance of the HTTP transport. */
	static HttpTransport httpTransport;
	/** Global instance of the JSON factory. */
	static final JsonFactory JSON_FACTORY = JacksonFactory.getDefaultInstance();
	/** Global Drive API client. */
	static Drive drive;

	public static void initialize() {
		try {
			httpTransport = GoogleNetHttpTransport.newTrustedTransport();
			dataStoreFactory = new FileDataStoreFactory(DATA_STORE_DIR);
			// authorization
			Credential credential = authorize();
			// set up the global Drive instance
			drive = new Drive.Builder(httpTransport, JSON_FACTORY, credential).setApplicationName(
					APPLICATION_NAME).build();

			// run commands

			File uploadedFile = uploadFile(false);
			System.out.println("1 File ID: " + uploadedFile.getId() + " File name: " + uploadedFile.getName());

			//			File updatedFile = updateFileWithTestSuffix(uploadedFile.getId());
			//			System.out.println("2File ID: " + updatedFile.getId() + " File name: " + updatedFile.getName());
			//
			//			downloadFile(false, updatedFile);
			//			System.out.println("3File ID: " + updatedFile.getId() + " File name: " + updatedFile.getName());
			//
			//			uploadedFile = uploadFile(true);
			//			System.out.println("4File ID: " + uploadedFile.getId() + " File name: " + uploadedFile.getName());
			//
			//			downloadFile(false, uploadedFile);
			//			System.out.println("5File ID: " + uploadedFile.getId() + " File name: " + uploadedFile.getName());

			return;
		} catch (IOException e) {
			System.err.println(e.getMessage());
		} catch (Throwable t) {
			t.printStackTrace();
		}
	}

	/** Authorizes the installed application to access user's protected data. */
	static Credential authorize() throws Exception {
		// load client secrets
		GoogleClientSecrets clientSecrets = GoogleClientSecrets.load(JSON_FACTORY,
				new InputStreamReader(Main.class.getResourceAsStream("/credentials.json")));
		// set up authorization code flow
		GoogleAuthorizationCodeFlow flow = new GoogleAuthorizationCodeFlow.Builder(
				httpTransport, JSON_FACTORY, clientSecrets,
				Collections.singleton(DriveScopes.DRIVE_FILE)).setDataStoreFactory(dataStoreFactory)
				.build();
		// authorize
		return new AuthorizationCodeInstalledApp(flow, new LocalServerReceiver()).authorize("user");
	}

	/** Uploads a file using either resumable or direct media upload. */
	private static File uploadFile(boolean useDirectUpload) throws IOException {
		//		File folderMetadata = new File();
		//		folderMetadata.setName(UPLOAD_FILE_PATH);
		//		folderMetadata.setMimeType("application/vnd.google-apps.folder");
		//		File file = drive.files().create(folderMetadata)
		//				.setFields("id")
		//				.execute();


		String folderId = "1_5YP_JcO-BpdCwfec6vjz-fDnejrE1jo";
		File fileMetadata = new File();
		fileMetadata.setName(UPLOAD_FILE.getName());
		fileMetadata.setParents(Collections.singletonList(folderId));

		FileContent mediaContent = new FileContent("application/json", UPLOAD_FILE);

		// Drive.Files.Insert not found
		Drive.Files.Create insert = drive.files().create(fileMetadata, mediaContent);
		insert.setFields("id, parents");
		MediaHttpUploader uploader = insert.getMediaHttpUploader();
		uploader.setDirectUploadEnabled(useDirectUpload);
		uploader.setProgressListener(new MediaHttpUploaderProgressListener() {

			@Override
			public void progressChanged(MediaHttpUploader uploader) throws IOException {
				System.out.println("progess changed: "+uploader.getProgress() + " " + uploader.getUploadState());
			}
		});
		return insert.execute();
	}

	/** Updates the name of the uploaded file to have a "drivetest-" prefix. */
	private static File updateFileWithTestSuffix(String id) throws IOException {
		File fileMetadata = new File();
		fileMetadata.setName("drivetest-" + UPLOAD_FILE.getName());

		Drive.Files.Update update = drive.files().update(id, fileMetadata);
		return update.execute();
	}

	/** Downloads a file using either resumable or direct media download. */
	static void downloadFile(boolean useDirectDownload, File uploadedFile)
			throws IOException {
		// create parent directory (if necessary)
		java.io.File parentDir = new java.io.File(DIR_FOR_DOWNLOADS);
		if (!parentDir.exists() && !parentDir.mkdirs()) {
			throw new IOException("Unable to create parent directory");
		}
		String fileName = (uploadedFile.getName() != null) ? uploadedFile.getName() : "name-failure";
		OutputStream out = new FileOutputStream(
				new java.io.File(parentDir, fileName));

		MediaHttpDownloader downloader =
				new MediaHttpDownloader(httpTransport, drive.getRequestFactory().getInitializer());
		downloader.setDirectDownloadEnabled(useDirectDownload);
		downloader.setProgressListener(new MediaHttpDownloaderProgressListener() {

			@Override
			public void progressChanged(MediaHttpDownloader downloader) throws IOException {

			}
		});
		String fileId = uploadedFile.getId();
		drive.files().get(fileId).executeMediaAndDownloadTo(out);
		out.close();
		//		downloader.download(new GenericUrl(uploadedFile.getDownloadUrl()), out);
	}

}
