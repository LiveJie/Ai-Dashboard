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
import SettingsService from '../services/settingsService';


const Settings = () => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await SettingsService.getAll()
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
          系统设置
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
                name
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, mt: 1 }}>
                {String((items?.[0]?.name ?? '-') )}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography color="text.secondary" variant="overline">
                modelId
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, mt: 1 }}>
                {String((items?.[0]?.modelId ?? '-') )}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography color="text.secondary" variant="overline">
                provider
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, mt: 1 }}>
                {String((items?.[0]?.provider ?? '-') )}
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
                                    <TableCell>name</TableCell>
                  <TableCell>modelId</TableCell>
                  <TableCell>provider</TableCell>
                  <TableCell>version</TableCell>
                  <TableCell>description</TableCell>
                  <TableCell>status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((row, idx) => (
                  <TableRow key={row?.id ?? idx} hover>
                                        <TableCell>{row?.name ?? '-'}</TableCell>
                    <TableCell>{row?.modelId ?? '-'}</TableCell>
                    <TableCell>{row?.provider ?? '-'}</TableCell>
                    <TableCell>{row?.version ?? '-'}</TableCell>
                    <TableCell>{row?.description ?? '-'}</TableCell>
                    <TableCell>{row?.status ?? '-'}</TableCell>
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

export default Settings;
