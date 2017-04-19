package ch.sysout.gameexplorer.api.filter;

public interface Filter<T> {
	boolean match(Criteria criteria, T t);
}
