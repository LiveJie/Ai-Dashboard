import React, { useState, useEffect } from 'react';
import { useMemo } from 'react';
import dayjs from 'dayjs';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
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
import ProjectsService from '../services/projectsService';
import AIModelsService from '../services/ai-modelsService';
import DashboardService from '../services/dashboardService';


const Dashboard = () => {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [projects, setProjects] = useState([])
  const [models, setModels] = useState([])

  const [filters, setFilters] = useState({
    projectId: '',
    aiModelId: '',
    days: 30,
  })

  useEffect(() => {
    loadFilters()
    loadData()
  }, [])

  useEffect(() => {
    loadData()
  }, [filters])

  const loadFilters = async () => {
    try {
      const [projectsRes, modelsRes] = await Promise.all([
        ProjectsService.getAll({ page: 1, limit: 50 }),
        AIModelsService.getAll({ page: 1, limit: 50 }),
      ])

      const projectItems = projectsRes?.items || projectsRes?.data?.items || []
      const modelItems = modelsRes?.items || modelsRes?.data?.items || []

      setProjects(projectItems)
      setModels(modelItems)
    } catch (e) {
      // ignore filter errors
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      const end = dayjs().endOf('day')
      const start = dayjs().subtract(filters.days, 'day').startOf('day')

      const response = await DashboardService.getAll({
        page: 1,
        limit: 100,
        projectId: filters.projectId || undefined,
        aiModelId: filters.aiModelId || undefined,
        startDate: start.format('YYYY-MM-DD'),
        endDate: end.format('YYYY-MM-DD'),
      })

      const rows = response?.items || response?.data?.items || []
      setItems(Array.isArray(rows) ? rows : [])
    } catch (e) {
      setError('获取数据失败')
    } finally {
      setLoading(false)
    }
  }

  const totals = useMemo(() => {
    const totalRequests = items.length
    const totalCost = items.reduce((sum, x) => sum + (Number(x.cost) || 0), 0)
    const totalTokens = items.reduce(
      (sum, x) => sum + (Number(x.inputTokens) || 0) + (Number(x.outputTokens) || 0),
      0,
    )
    const avgLatency =
      totalRequests === 0
        ? 0
        : items.reduce((sum, x) => sum + (Number(x.responseTime) || 0), 0) / totalRequests
    return { totalRequests, totalCost, totalTokens, avgLatency }
  }, [items])

  const series = useMemo(() => {
    const bucket = new Map()
    items.forEach((x) => {
      const key = dayjs(x.timestamp || x.createdAt).format('MM-DD')
      if (!bucket.has(key)) bucket.set(key, { date: key, requests: 0, cost: 0 })
      const row = bucket.get(key)
      row.requests += 1
      row.cost += Number(x.cost) || 0
    })
    return Array.from(bucket.values()).sort((a, b) => (a.date > b.date ? 1 : -1))
  }, [items])

  const filteredItems = useMemo(() => {
    return items.slice().sort((a, b) => {
      const at = new Date(a.timestamp || a.createdAt).getTime()
      const bt = new Date(b.timestamp || b.createdAt).getTime()
      return bt - at
    })
  }, [items])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 420 }}>
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
      <Box
        sx={{
          display: 'flex',
          alignItems: { xs: 'flex-start', md: 'center' },
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 2,
          mb: 4,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            仪表板
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            最近 {filters.days} 天
          </Typography>
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ width: { xs: '100%', md: 'auto' } }}>
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>项目</InputLabel>
            <Select
              label="项目"
              value={filters.projectId}
              onChange={(e) => setFilters((s) => ({ ...s, projectId: e.target.value }))}
            >
              <MenuItem value="">全部</MenuItem>
              {projects.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>模型</InputLabel>
            <Select
              label="模型"
              value={filters.aiModelId}
              onChange={(e) => setFilters((s) => ({ ...s, aiModelId: e.target.value }))}
            >
              <MenuItem value="">全部</MenuItem>
              {models.map((m) => (
                <MenuItem key={m.id} value={m.id}>
                  {m.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>时间范围</InputLabel>
            <Select
              label="时间范围"
              value={filters.days}
              onChange={(e) => setFilters((s) => ({ ...s, days: e.target.value }))}
            >
              <MenuItem value={7}>7 天</MenuItem>
              <MenuItem value={30}>30 天</MenuItem>
              <MenuItem value={90}>90 天</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card variant="outlined">
            <CardContent>
              <Typography color="text.secondary" variant="overline">
                请求数
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 1 }}>
                {totals.totalRequests}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card variant="outlined">
            <CardContent>
              <Typography color="text.secondary" variant="overline">
                总成本
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 1 }}>
                {totals.totalCost.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card variant="outlined">
            <CardContent>
              <Typography color="text.secondary" variant="overline">
                Token 总量
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 1 }}>
                {totals.totalTokens}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card variant="outlined">
            <CardContent>
              <Typography color="text.secondary" variant="overline">
                平均耗时 (ms)
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 1 }}>
                {Math.round(totals.avgLatency)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  趋势
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  请求数（折线）
                </Typography>
              </Box>
              <Box sx={{ p: 2, height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={series}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="requests" stroke="#6366F1" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card variant="outlined">
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              使用日志
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              共 {filteredItems.length} 条
            </Typography>
          </Box>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>时间</TableCell>
                  <TableCell>项目</TableCell>
                  <TableCell>模型</TableCell>
                  <TableCell>类型</TableCell>
                  <TableCell align="right">输入</TableCell>
                  <TableCell align="right">输出</TableCell>
                  <TableCell align="right">耗时</TableCell>
                  <TableCell align="right">成本</TableCell>
                  <TableCell>状态</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredItems.map((row, idx) => (
                  <TableRow key={row?.id ?? idx} hover>
                    <TableCell>{dayjs(row.timestamp || row.createdAt).format('YYYY-MM-DD HH:mm')}</TableCell>
                    <TableCell>{row.projectId}</TableCell>
                    <TableCell>{row.aiModelId}</TableCell>
                    <TableCell>{row.requestType}</TableCell>
                    <TableCell align="right">{row.inputTokens ?? '-'}</TableCell>
                    <TableCell align="right">{row.outputTokens ?? '-'}</TableCell>
                    <TableCell align="right">{row.responseTime ?? '-'}</TableCell>
                    <TableCell align="right">{Number(row.cost || 0).toFixed(2)}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={row.success === false ? '失败' : '成功'}
                        color={row.success === false ? 'error' : 'success'}
                        variant="outlined"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  )
}

export default Dashboard
