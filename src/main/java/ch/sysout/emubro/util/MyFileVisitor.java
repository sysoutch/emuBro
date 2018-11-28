package ch.sysout.emubro.util;

import java.io.IOException;
import java.nio.file.FileVisitResult;
import java.nio.file.FileVisitor;
import java.nio.file.Path;
import java.nio.file.attribute.BasicFileAttributes;

public class MyFileVisitor implements FileVisitor<Path> {
	private int fileCount = 0;
	private int dirCount = 0;

	/**
	 * Hier ist Path immer ein Directory der Größe 0
	 */
	@Override
	public FileVisitResult preVisitDirectory(Path path, BasicFileAttributes bfa) throws IOException {
		System.out.println("preVisitDirectory: " + path + " size = " + bfa.size() + " bytes");
		dirCount++;
		return FileVisitResult.CONTINUE;
	}

	/**
	 * Hier ist Path immer ein Directory der Größe 0 ex = null wenn keine Exception
	 * aufgetreten ist
	 */
	@Override
	public FileVisitResult postVisitDirectory(Path path, IOException ex) throws IOException {
		System.out.println("postVisitDirectory: " + path + " Exception = " + ex);
		return FileVisitResult.CONTINUE;
	}

	/**
	 */
	@Override
	public FileVisitResult visitFile(Path path, BasicFileAttributes bfa) throws IOException {
		System.out.println("visitFile: " + path + " size = " + bfa.size() + " bytes");
		fileCount++;
		return FileVisitResult.CONTINUE;
	}

	/**
	 */
	@Override
	public FileVisitResult visitFileFailed(Path path, IOException ex) throws IOException {
		System.out.println("visitFileFailed " + " Exception = " + ex);
		return FileVisitResult.CONTINUE;
	}

	public int getFileCount() {
		return fileCount;
	}

	public int getDirCount() {
		return dirCount;
	}
}