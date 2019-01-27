package ch.sysout.util;

import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

public class FileUtil {

	public static String getParentDirPath(String fileOrDirPath) {
		boolean endsWithSlash = fileOrDirPath.endsWith(File.separator);
		if (fileOrDirPath == null || fileOrDirPath.isEmpty()) {
			return "";
		}
		int minusTwo = fileOrDirPath.length() - 2;
		int minusOne = fileOrDirPath.length() - 1;
		int subString = fileOrDirPath.lastIndexOf(File.separatorChar, endsWithSlash ? minusTwo : minusOne);
		return (subString > 0) ? fileOrDirPath.substring(0, subString) : "";
	}

	public static void unzipArchive(File zipFilePath, String destDir) {
		unzipArchive(zipFilePath, destDir, false);
	}

	public static void unzipArchive(File zipFilePath, String destDir, boolean deleteArchiveFileAfterUnzip) {
		FileInputStream fis;
		//buffer for read and write data to file
		//		byte[] buffer = new byte[1024];
		try {
			fis = new FileInputStream(zipFilePath);
			ZipInputStream zis = new ZipInputStream(fis);
			ZipEntry ze = zis.getNextEntry();
			while (ze != null) {
				String fileName = destDir + File.separator + ze.getName();
				if (!ze.isDirectory()) {
					// if the entry is a file, extracts it
					extractFile(zis, fileName);
				} else {
					// if the entry is a directory, make the directory
					File dir = new File(fileName);
					dir.mkdir();
				}
				//close this ZipEntry
				zis.closeEntry();
				ze = zis.getNextEntry();
			}
			//close last ZipEntry
			zis.closeEntry();
			zis.close();
			fis.close();
			zipFilePath.delete();
		} catch (IOException e) {
			e.printStackTrace();
		}
	}

	public static void extractFile(ZipInputStream zipIn, String filePath) throws IOException {
		BufferedOutputStream bos = new BufferedOutputStream(new FileOutputStream(filePath));
		byte[] bytesIn = new byte[4096];
		int read = 0;
		while ((read = zipIn.read(bytesIn)) != -1) {
			bos.write(bytesIn, 0, read);
		}
		bos.close();
	}

}
