import React, { useState, useEffect } from 'react';
import { TextField, Button, Typography, Container, Box, Card, CardContent, CircularProgress, Chip } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

interface Document {
  id: number;
  title: string;
  content: string;
  category: string;
  similarity: number;
}

interface SearchResult {
  results: Document[];
}

const VectorSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(`/api/legal-documents/search?query=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Поиск не удался');
      }
      
      const data: SearchResult = await response.json();
      setResults(data.results || []);
    } catch (err) {
      setError('Произошла ошибка при выполнении поиска');
      console.error('Error searching documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Container>
      <Typography variant="h4" component="h1" gutterBottom>
        Интеллектуальный поиск по юридическим документам
      </Typography>
      
      <Box sx={{ display: 'flex', mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Введите ваш запрос..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <Button
          variant="contained"
          color="primary"
          onClick={handleSearch}
          disabled={loading}
          sx={{ ml: 1, whiteSpace: 'nowrap' }}
          startIcon={<SearchIcon />}
        >
          Найти
        </Button>
      </Box>

      {loading && (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Typography color="error" variant="body1">
          {error}
        </Typography>
      )}

      {results.length > 0 && (
        <>
          <Typography variant="h6" gutterBottom>
            Результаты ({results.length})
          </Typography>
          
          {results.map((doc) => (
            <Card key={doc.id} sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" component="div">
                  {doc.title}
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 1, my: 1 }}>
                  <Chip 
                    label={doc.category} 
                    size="small" 
                    color="primary" 
                    variant="outlined" 
                  />
                  <Chip 
                    label={`Релевантность: ${Math.round(doc.similarity * 100)}%`} 
                    size="small"
                    color={doc.similarity > 0.7 ? "success" : "default"}
                  />
                </Box>
                
                <Typography variant="body2" color="text.secondary">
                  {doc.content.length > 200 
                    ? `${doc.content.substring(0, 200)}...` 
                    : doc.content}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </>
      )}

      {!loading && query && results.length === 0 && (
        <Typography variant="body1">
          По вашему запросу ничего не найдено
        </Typography>
      )}
    </Container>
  );
};

export default VectorSearch; 