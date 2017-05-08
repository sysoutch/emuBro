package ch.sysout.emubro.api.filter;

public interface Filter<T> {
	boolean match(Criteria criteria, T t);
}
