import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import AnalyticsService from '../services/analyticsService';


const Analytics = () => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await AnalyticsService.getAll()
      const payload =
        response?.items !== undefined
          ? response
          : response?.data !== undefined
            ? response.data
            : response
      setData(payload)
    } catch (err) {
      setError('获取数据失败')
    } finally {
      setLoading(false)
    }
  }

  const items = Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data)
      ? data
      : Array.isArray(data?.data?.items)
        ? data.data.items
        : []

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 360 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        {error}
      </Alert>
    )
  }

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          数据分析
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          undefined
        </Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography color="text.secondary" variant="overline">
                projectId
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, mt: 1 }}>
                {String((items?.[0]?.projectId ?? '-') )}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography color="text.secondary" variant="overline">
                aiModelId
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, mt: 1 }}>
                {String((items?.[0]?.aiModelId ?? '-') )}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography color="text.secondary" variant="overline">
                requestType
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, mt: 1 }}>
                {String((items?.[0]?.requestType ?? '-') )}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

      </Grid>

      <Card variant="outlined">
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              列表
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              共 {items.length} 条
            </Typography>
          </Box>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                                    <TableCell>projectId</TableCell>
                  <TableCell>aiModelId</TableCell>
                  <TableCell>requestType</TableCell>
                  <TableCell>inputTokens</TableCell>
                  <TableCell>outputTokens</TableCell>
                  <TableCell>responseTime</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((row, idx) => (
                  <TableRow key={row?.id ?? idx} hover>
                                        <TableCell>{row?.projectId ?? '-'}</TableCell>
                    <TableCell>{row?.aiModelId ?? '-'}</TableCell>
                    <TableCell>{row?.requestType ?? '-'}</TableCell>
                    <TableCell>{row?.inputTokens ?? '-'}</TableCell>
                    <TableCell>{row?.outputTokens ?? '-'}</TableCell>
                    <TableCell>{row?.responseTime ?? '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  )
};

export default Analytics;
