{{IMPORTS}}

const {{PAGE_NAME}} = () => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await {{PAGE_NAME}}Service.getAll()
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
          {{PAGE_TITLE}}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {{SCHEMA_NAME}}
        </Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {{SCHEMA_PROPERTIES}}
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
                  {{TABLE_HEADERS}}
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((row, idx) => (
                  <TableRow key={row?.id ?? idx} hover>
                    {{TABLE_CELLS}}
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

export default {{PAGE_NAME}};
