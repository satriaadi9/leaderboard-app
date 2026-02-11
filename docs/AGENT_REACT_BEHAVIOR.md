# AI Agent React Behavior - Quick Reference

**Project**: Web Application  
**Framework**: React 18 + TypeScript + React Router  
**Style**: Functional components, hooks, type-safe props

## Component Structure

### Standard Template (Follow This Order)

```typescript
// 1. Imports (external → internal → types → styles)
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { itemService } from '@/services/item.service';
import { Button } from '@/components/common/Button';
import type { Item } from '@/types';

// 2. Types/Interfaces
interface ItemListProps {
  ownerId: string;
  onItemSelect?: (item: Item) => void;
}

// 3. Constants
const ITEMS_PER_PAGE = 10;

// 4. Component
export const ItemList: React.FC<ItemListProps> = ({ ownerId, onItemSelect }) => {
  // 4a. Hooks (useState, useContext, custom hooks)
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  // 4b. Effects
  useEffect(() => {
    loadItems();
  }, [ownerId]);

  // 4c. Event Handlers (useCallback for optimization)
  const handleClick = useCallback((item: Item): void => {
    onItemSelect?.(item) ?? navigate(`/items/${item.id}`);
  }, [onItemSelect, navigate]);

  // 4d. Helper Functions
  const loadItems = async (): Promise<void> => {
    try {
      setLoading(true);
      const data = await itemService.getAll(ownerId);
      setItems(data);
    } finally {
      setLoading(false);
    }
  };

  // 4e. Early Returns
  if (loading) return <LoadingSpinner />;
  if (items.length === 0) return <EmptyState />;

  // 4f. Main Render
  return (
    <div className="item-list">
      {items.map(item => (
        <ItemCard key={item.id} item={item} onClick={() => handleClick(item)} />
      ))}
    </div>
  );
};
```

## Component Rules

**✅ DO:**

- Use functional components with `React.FC<Props>`
- Destructure props in function signature
- Keep components < 300 lines
- Use early returns for loading/error states
- Use `useCallback` for event handlers passed to children
- Use `useMemo` for expensive computations
- Add TypeScript types for all props

**❌ DON'T:**

- Use class components
- Use inline functions in JSX: `onClick={() => doSomething()}` (causes re-renders)
- Mutate state directly: `state.items.push(item)`
- Use index as key: `key={index}`
- Forget cleanup in useEffect
- Create components inside components

## State Management

### Local State (useState)

```typescript
// ✅ Simple state
const [count, setCount] = useState(0);
const [user, setUser] = useState<User | null>(null);

// ✅ Object state (immutable updates)
const [form, setForm] = useState({ title: '', duration: 60 });
setForm(prev => ({ ...prev, title: 'New' }));

// ✅ Array state (immutable updates)
setItems(prev => [...prev, newItem]); // Add
setItems(prev => prev.filter(item => item.id !== id)); // Remove
setItems(prev => prev.map(item => (item.id === id ? { ...item, ...updates } : item))); // Update
```

### Complex State (useReducer)

```typescript
// Use when you have related state values
interface State {
  items: Item[];
  loading: boolean;
  error: string | null;
}

type Action =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: Item[] }
  | { type: 'FETCH_ERROR'; payload: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS':
      return { ...state, loading: false, items: action.payload };
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
}

const [state, dispatch] = useReducer(reducer, initialState);
dispatch({ type: 'FETCH_SUCCESS', payload: items });
```

## Custom Hooks Pattern

### Extract Reusable Logic

```typescript
// hooks/useCountdown.ts
interface UseCountdownOptions {
  endTime: Date;
  onExpire?: () => void;
}

interface UseCountdownReturn {
  timeRemaining: number;
  isExpired: boolean;
  formattedTime: string;
}

export const useCountdown = ({ endTime, onExpire }: UseCountdownOptions): UseCountdownReturn => {
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.floor((endTime.getTime() - Date.now()) / 1000);
      setTimeRemaining(Math.max(0, remaining));

      if (remaining <= 0) {
        clearInterval(interval);
        onExpire?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [endTime, onExpire]);

  const formattedTime = `${Math.floor(timeRemaining / 60)}:${(timeRemaining % 60).toString().padStart(2, '0')}`;

  return { timeRemaining, isExpired: timeRemaining === 0, formattedTime };
};

// Usage
const { formattedTime, isExpired } = useCountdown({
  endTime: task.endTime,
  onExpire: handleSubmit,
});
```

### Data Fetching Hook

```typescript
// hooks/useFetch.ts
interface UseFetchReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useFetch = <T>(
  fetchFn: () => Promise<T>,
  deps: React.DependencyList = []
): UseFetchReturn<T> => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    fetchData();
  }, deps);

  return { data, loading, error, refetch: fetchData };
};

// Usage
const { data: items, loading, error, refetch } = useFetch(() => itemService.getAll(), [userId]);
```

## Context Pattern

### Create Context with Hook

```typescript
// contexts/AuthContext.tsx
interface AuthContextValue {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    const { user: userData, token } = await authService.login(email, password);
    localStorage.setItem('token', token);
    setUser(userData);
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    await authService.logout();
    localStorage.removeItem('token');
    setUser(null);
  }, []);

  const value: AuthContextValue = {
    user,
    login,
    logout,
    isAuthenticated: user !== null
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook (required pattern)
export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// Usage
const { user, logout } = useAuth();
```

## Performance Optimization

### React.memo (Prevent Re-renders)

```typescript
interface ItemCardProps {
  item: Item;
  onClick: (item: Item) => void;
}

// ✅ Memoize component
export const ItemCard = React.memo<ItemCardProps>(({ item, onClick }) => {
  return (
    <div onClick={() => onClick(item)}>
      <h3>{item.title}</h3>
    </div>
  );
});

// ✅ Custom comparison
export const ItemCard = React.memo<ItemCardProps>(
  ({ item, onClick }) => { /* ... */ },
  (prev, next) => prev.item.id === next.item.id
);
```

### useCallback (Memoize Functions)

```typescript
// ❌ Creates new function on every render
const handleClick = () => console.log('click');

// ✅ Same function reference
const handleClick = useCallback(() => {
  console.log('click');
}, []);

const handleDelete = useCallback((id: string) => {
  deleteItem(id);
}, []); // Empty if deleteItem is stable
```

### useMemo (Memoize Computations)

```typescript
// ❌ Recalculates every render
const filtered = items.filter(e => e.status === filter);

// ✅ Only recalculates when dependencies change
const filtered = useMemo(() => {
  return items.filter(e => e.status === filter);
}, [items, filter]);

const stats = useMemo(() => {
  return calculateStatistics(items);
}, [items]);
```

### Code Splitting (Lazy Loading)

```typescript
import { lazy, Suspense } from 'react';

// ✅ Lazy load heavy components
const ItemEditor = lazy(() => import('./components/ItemEditor'));
const ResultsChart = lazy(() => import('./components/ResultsChart'));

const Dashboard = () => (
  <div>
    <Suspense fallback={<LoadingSpinner />}>
      <ItemEditor />
    </Suspense>

    <Suspense fallback={<div>Loading charts...</div>}>
      <ResultsChart />
    </Suspense>
  </div>
);
```

## Form Handling

### Controlled Components

```typescript
const ItemForm: React.FC<{ onSubmit: (data: FormData) => void }> = ({ onSubmit }) => {
  const [form, setForm] = useState({ title: '', priority: 5 });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));

    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.title.trim()) newErrors.title = 'Title required';
    if (form.priority < 1) newErrors.priority = 'Invalid priority';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await onSubmit(form);
    } catch (err) {
      setErrors({ submit: 'Failed to submit' });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="title">Title</label>
        <input
          id="title"
          name="title"
          value={form.title}
          onChange={handleChange}
          aria-invalid={!!errors.title}
        />
        {errors.title && <span className="error">{errors.title}</span>}
      </div>

      <button type="submit">Submit</button>
    </form>
  );
};
```

## Error Boundary

```typescript
// components/ErrorBoundary.tsx
interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <button onClick={() => window.location.reload()}>Reload</button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Usage
<ErrorBoundary fallback={<ErrorPage />}>
  <App />
</ErrorBoundary>
```

## Component Patterns

### Compound Components

```typescript
// Tab.tsx
interface TabsContextValue {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TabsContext = createContext<TabsContextValue | undefined>(undefined);

export const Tabs: React.FC<{ children: React.ReactNode; defaultTab: string }> = ({
  children,
  defaultTab
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab);
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </TabsContext.Provider>
  );
};

export const Tab: React.FC<{ value: string; children: React.ReactNode }> = ({ value, children }) => {
  const { activeTab, setActiveTab } = useContext(TabsContext)!;
  return (
    <button
      className={activeTab === value ? 'active' : ''}
      onClick={() => setActiveTab(value)}
    >
      {children}
    </button>
  );
};

export const TabPanel: React.FC<{ value: string; children: React.ReactNode }> = ({ value, children }) => {
  const { activeTab } = useContext(TabsContext)!;
  return activeTab === value ? <div>{children}</div> : null;
};

// Usage
<Tabs defaultTab="details">
  <Tab value="details">Details</Tab>
  <Tab value="content">Content</Tab>
  <TabPanel value="details"><ItemDetails /></TabPanel>
  <TabPanel value="content"><ContentList /></TabPanel>
</Tabs>
```

## File Organization

```
src/
├── components/
│   ├── common/        # Reusable (Button, Input, Modal)
│   ├── layout/        # Layout (Header, Sidebar, Footer)
│   └── item/          # Feature-specific
├── pages/             # Route-level components
│   ├── auth/
│   ├── user/
│   └── admin/
├── hooks/             # Custom hooks
├── contexts/          # React contexts
├── services/          # API services
├── types/             # TypeScript types
└── utils/             # Utility functions
```

## Critical Rules

1. **Structure**: Follow template order (imports → types → constants → component → hooks → effects → handlers → helpers → early returns → render)
2. **Types**: Always use `React.FC<Props>` with explicit prop types
3. **Performance**: Use `React.memo`, `useCallback`, `useMemo` appropriately
4. **State**: Keep local when possible, use Context for global, never mutate
5. **Hooks**: Extract reusable logic into custom hooks
6. **Forms**: Use controlled components with validation
7. **Errors**: Wrap app in ErrorBoundary
8. **Loading**: Always show loading states, use Suspense for lazy loading

## Quick Decision Tree

**Need reusable logic?**
→ Create custom hook in `hooks/`

**Need global state?**
→ Create Context with Provider and custom hook

**Component re-rendering too much?**
→ Use `React.memo` + `useCallback` + `useMemo`

**Need expensive computation?**
→ Use `useMemo`

**Passing function to child?**
→ Use `useCallback`

**Heavy component?**
→ Use `lazy()` + `Suspense`

**Form with validation?**
→ Controlled components + error state

## Summary

**Write modern React:**

- Functional components with hooks
- TypeScript for all props
- Custom hooks for reusable logic
- Context for global state
- Performance optimization (memo, useCallback, useMemo)
- Code splitting for heavy components
- Error boundaries for error handling

**Every component should be type-safe, performant, and maintainable.**
