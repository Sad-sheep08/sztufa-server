# SZTU-FA-Server 数据接口文档

## 概述

本文档详细描述了深圳技术大学足球协会展示站后端服务（sztu-fa-server）中所有涉及数据获取的 HTTP GET 请求接口。文档旨在帮助前端开发人员快速对接后端 API。

---

## 基础信息

| 项目 | 值 |
|------|-----|
| 服务名称 | sztu-fa-server |
| API 版本 | v1 |
| 基础路径 | `/api/v1` |
| 服务端口 | 3000 |

---

## 接口列表

### 1. 比赛接口

#### 1.1 获取比赛列表

- **URL**: `GET /api/v1/matches`
- **功能描述**: 获取比赛列表，支持分页和按球队筛选
- **使用场景**: 展示所有比赛、特定球队的比赛记录

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `page` | number | 否 | 页码，默认值为 1 |
| `limit` | number | 否 | 每页数量，默认值为 10 |
| `teamId` | string | 否 | 球队 ID，用于筛选特定球队的比赛 |

**请求头**:

| 头信息 | 值 | 必填 |
|--------|-----|------|
| `Content-Type` | `application/json` | 是 |

**成功响应** (200 OK):

```json
{
  "data": [
    {
      "id": "clx2p9g2w0000qz7j853e7q8x",
      "homeTeamId": "clx1p3k2m0000qz7j823e7q8y",
      "awayTeamId": "clx1p3k2m0001qz7j823e7q8z",
      "homeTeam": {
        "id": "clx1p3k2m0000qz7j823e7q8y",
        "teamName": "计算机学院",
        "teamLogo": "https://example.com/logo1.png"
      },
      "awayTeam": {
        "id": "clx1p3k2m0001qz7j823e7q8z",
        "teamName": "电子学院",
        "teamLogo": "https://example.com/logo2.png"
      },
      "homeScore": 2,
      "awayScore": 1,
      "matchDate": "2024-11-15T14:00:00.000Z",
      "location": "西丽校区足球场",
      "status": "completed",
      "createdAt": "2024-11-10T10:00:00.000Z",
      "updatedAt": "2024-11-15T15:00:00.000Z"
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 10
}
```

**响应字段说明**:

| 字段 | 类型 | 说明 |
|------|------|------|
| `data` | array | 比赛数据数组 |
| `data[].id` | string | 比赛唯一标识 |
| `data[].homeTeamId` | string | 主队 ID |
| `data[].awayTeamId` | string | 客队 ID |
| `data[].homeTeam` | object | 主队信息 |
| `data[].awayTeam` | object | 客队信息 |
| `data[].homeScore` | number | 主队得分 |
| `data[].awayScore` | number | 客队得分 |
| `data[].matchDate` | string | 比赛日期（ISO 8601） |
| `data[].location` | string | 比赛地点 |
| `data[].status` | string | 比赛状态：scheduled（未开始）、in_progress（进行中）、completed（已结束） |
| `data[].createdAt` | string | 创建时间 |
| `data[].updatedAt` | string | 更新时间 |
| `total` | number | 总记录数 |
| `page` | number | 当前页码 |
| `limit` | number | 每页数量 |

**错误响应**:

| 状态码 | 错误信息 | 说明 |
|--------|----------|------|
| 400 | `Validation failed (numeric string is expected)` | page 或 limit 参数传入非整数值 |
| 500 | `Internal server error` | 服务器内部错误 |

---

#### 1.2 获取单个比赛

- **URL**: `GET /api/v1/matches/:id`
- **功能描述**: 根据 ID 获取单个比赛的详细信息
- **使用场景**: 查看比赛详情页面

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `id` | string | 是 | 比赛 ID |

**请求头**:

| 头信息 | 值 | 必填 |
|--------|-----|------|
| `Content-Type` | `application/json` | 是 |

**成功响应** (200 OK):

```json
{
  "id": "clx2p9g2w0000qz7j853e7q8x",
  "homeTeamId": "clx1p3k2m0000qz7j823e7q8y",
  "awayTeamId": "clx1p3k2m0001qz7j823e7q8z",
  "homeTeam": {
    "id": "clx1p3k2m0000qz7j823e7q8y",
    "teamName": "计算机学院",
    "teamDoctor": "张医生",
    "headCoach": "李教练",
    "teamLeader": "王队长",
    "coachPhone": "13800138001",
    "leaderPhone": "13800138002",
    "homeJerseyColor": "红色",
    "awayJerseyColor": "白色",
    "teamLogo": "https://example.com/logo1.png",
    "homeJersey": "https://example.com/jersey_home.png",
    "awayJersey": "https://example.com/jersey_away.png",
    "createdAt": "2024-10-01T08:00:00.000Z",
    "updatedAt": "2024-10-01T08:00:00.000Z"
  },
  "awayTeam": {
    "id": "clx1p3k2m0001qz7j823e7q8z",
    "teamName": "电子学院",
    "teamDoctor": "陈医生",
    "headCoach": "赵教练",
    "teamLeader": "刘队长",
    "coachPhone": "13800138003",
    "leaderPhone": "13800138004",
    "homeJerseyColor": "蓝色",
    "awayJerseyColor": "黄色",
    "teamLogo": "https://example.com/logo2.png",
    "homeJersey": "https://example.com/jersey_home2.png",
    "awayJersey": "https://example.com/jersey_away2.png",
    "createdAt": "2024-10-02T09:00:00.000Z",
    "updatedAt": "2024-10-02T09:00:00.000Z"
  },
  "homeScore": 2,
  "awayScore": 1,
  "matchDate": "2024-11-15T14:00:00.000Z",
  "location": "西丽校区足球场",
  "status": "completed",
  "createdAt": "2024-11-10T10:00:00.000Z",
  "updatedAt": "2024-11-15T15:00:00.000Z"
}
```

**响应字段说明**:

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 比赛唯一标识 |
| `homeTeamId` | string | 主队 ID |
| `awayTeamId` | string | 客队 ID |
| `homeTeam` | object | 主队完整信息 |
| `awayTeam` | object | 客队完整信息 |
| `homeScore` | number | 主队得分 |
| `awayScore` | number | 客队得分 |
| `matchDate` | string | 比赛日期 |
| `location` | string | 比赛地点 |
| `status` | string | 比赛状态 |
| `createdAt` | string | 创建时间 |
| `updatedAt` | string | 更新时间 |

**错误响应**:

| 状态码 | 错误信息 | 说明 |
|--------|----------|------|
| 404 | `Match not found` | 比赛不存在 |
| 500 | `Internal server error` | 服务器内部错误 |

---

### 2. 球员接口

#### 2.1 获取球员列表

- **URL**: `GET /api/v1/players`
- **功能描述**: 获取球员列表，支持分页和按球队筛选
- **使用场景**: 展示所有球员、特定球队的球员名单

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `teamId` | string | 否 | 球队 ID，用于筛选特定球队的球员 |
| `page` | number | 否 | 页码，默认值为 1 |
| `limit` | number | 否 | 每页数量，默认值为 10 |

**请求头**:

| 头信息 | 值 | 必填 |
|--------|-----|------|
| `Content-Type` | `application/json` | 是 |

**成功响应** (200 OK):

```json
{
  "data": [
    {
      "id": "clx3p9g2w0000qz7j853e7q9a",
      "name": "张三",
      "studentId": "2021001001",
      "jerseyNumber": "10",
      "photo": "https://example.com/player1.jpg",
      "teamId": "clx1p3k2m0000qz7j823e7q8y",
      "team": {
        "id": "clx1p3k2m0000qz7j823e7q8y",
        "teamName": "计算机学院"
      },
      "createdAt": "2024-10-05T08:00:00.000Z",
      "updatedAt": "2024-10-05T08:00:00.000Z"
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 10
}
```

**响应字段说明**:

| 字段 | 类型 | 说明 |
|------|------|------|
| `data` | array | 球员数据数组 |
| `data[].id` | string | 球员唯一标识 |
| `data[].name` | string | 球员姓名 |
| `data[].studentId` | string | 学号 |
| `data[].jerseyNumber` | string | 球衣号码 |
| `data[].photo` | string | 球员照片 URL |
| `data[].teamId` | string | 所属球队 ID |
| `data[].team` | object | 所属球队信息 |
| `data[].createdAt` | string | 创建时间 |
| `data[].updatedAt` | string | 更新时间 |
| `total` | number | 总记录数 |
| `page` | number | 当前页码 |
| `limit` | number | 每页数量 |

**错误响应**:

| 状态码 | 错误信息 | 说明 |
|--------|----------|------|
| 400 | `Validation failed (numeric string is expected)` | page 或 limit 参数传入非整数值 |
| 500 | `Internal server error` | 服务器内部错误 |

---

#### 2.2 按名称搜索球员

- **URL**: `GET /api/v1/players/search`
- **功能描述**: 根据球员姓名进行模糊搜索
- **使用场景**: 球员搜索功能、快速查找特定球员

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `name` | string | 是 | 球员姓名（支持模糊匹配） |

**请求头**:

| 头信息 | 值 | 必填 |
|--------|-----|------|
| `Content-Type` | `application/json` | 是 |

**成功响应** (200 OK):

```json
[
  {
    "id": "clx3p9g2w0000qz7j853e7q9a",
    "name": "张三",
    "studentId": "2021001001",
    "jerseyNumber": "10",
    "photo": "https://example.com/player1.jpg",
    "teamId": "clx1p3k2m0000qz7j823e7q8y",
    "team": {
      "id": "clx1p3k2m0000qz7j823e7q8y",
      "teamName": "计算机学院"
    },
    "createdAt": "2024-10-05T08:00:00.000Z",
    "updatedAt": "2024-10-05T08:00:00.000Z"
  },
  {
    "id": "clx3p9g2w0001qz7j853e7q9b",
    "name": "张四",
    "studentId": "2021001002",
    "jerseyNumber": "7",
    "photo": "https://example.com/player2.jpg",
    "teamId": "clx1p3k2m0000qz7j823e7q8y",
    "team": {
      "id": "clx1p3k2m0000qz7j823e7q8y",
      "teamName": "计算机学院"
    },
    "createdAt": "2024-10-06T09:00:00.000Z",
    "updatedAt": "2024-10-06T09:00:00.000Z"
  }
]
```

**响应字段说明**: 同球员列表接口

**错误响应**:

| 状态码 | 错误信息 | 说明 |
|--------|----------|------|
| 400 | `Name parameter is required` | 缺少必需参数 |
| 500 | `Internal server error` | 服务器内部错误 |

---

#### 2.3 获取单个球员

- **URL**: `GET /api/v1/players/:id`
- **功能描述**: 根据 ID 获取单个球员的详细信息
- **使用场景**: 查看球员个人详情页面

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `id` | string | 是 | 球员 ID |

**请求头**:

| 头信息 | 值 | 必填 |
|--------|-----|------|
| `Content-Type` | `application/json` | 是 |

**成功响应** (200 OK):

```json
{
  "id": "clx3p9g2w0000qz7j853e7q9a",
  "name": "张三",
  "studentId": "2021001001",
  "jerseyNumber": "10",
  "photo": "https://example.com/player1.jpg",
  "teamId": "clx1p3k2m0000qz7j823e7q8y",
  "team": {
    "id": "clx1p3k2m0000qz7j823e7q8y",
    "teamName": "计算机学院",
    "teamDoctor": "张医生",
    "headCoach": "李教练",
    "teamLeader": "王队长",
    "coachPhone": "13800138001",
    "leaderPhone": "13800138002",
    "homeJerseyColor": "红色",
    "awayJerseyColor": "白色",
    "teamLogo": "https://example.com/logo1.png",
    "homeJersey": "https://example.com/jersey_home.png",
    "awayJersey": "https://example.com/jersey_away.png",
    "createdAt": "2024-10-01T08:00:00.000Z",
    "updatedAt": "2024-10-01T08:00:00.000Z"
  },
  "createdAt": "2024-10-05T08:00:00.000Z",
  "updatedAt": "2024-10-05T08:00:00.000Z"
}
```

**响应字段说明**:

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 球员唯一标识 |
| `name` | string | 球员姓名 |
| `studentId` | string | 学号 |
| `jerseyNumber` | string | 球衣号码 |
| `photo` | string | 球员照片 URL |
| `teamId` | string | 所属球队 ID |
| `team` | object | 所属球队完整信息 |
| `createdAt` | string | 创建时间 |
| `updatedAt` | string | 更新时间 |

**错误响应**:

| 状态码 | 错误信息 | 说明 |
|--------|----------|------|
| 404 | `Player not found` | 球员不存在 |
| 500 | `Internal server error` | 服务器内部错误 |

---

### 3. 球队接口

#### 3.1 获取球队列表

- **URL**: `GET /api/v1/teams`
- **功能描述**: 获取球队列表，支持分页
- **使用场景**: 展示所有球队、球队选择列表

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `page` | number | 否 | 页码，默认值为 1 |
| `limit` | number | 否 | 每页数量，默认值为 10 |

**请求头**:

| 头信息 | 值 | 必填 |
|--------|-----|------|
| `Content-Type` | `application/json` | 是 |

**成功响应** (200 OK):

```json
{
  "data": [
    {
      "id": "clx1p3k2m0000qz7j823e7q8y",
      "teamName": "计算机学院",
      "teamDoctor": "张医生",
      "headCoach": "李教练",
      "teamLeader": "王队长",
      "coachPhone": "13800138001",
      "leaderPhone": "13800138002",
      "homeJerseyColor": "红色",
      "awayJerseyColor": "白色",
      "teamLogo": "https://example.com/logo1.png",
      "homeJersey": "https://example.com/jersey_home.png",
      "awayJersey": "https://example.com/jersey_away.png",
      "createdAt": "2024-10-01T08:00:00.000Z",
      "updatedAt": "2024-10-01T08:00:00.000Z"
    }
  ],
  "total": 12,
  "page": 1,
  "limit": 10
}
```

**响应字段说明**:

| 字段 | 类型 | 说明 |
|------|------|------|
| `data` | array | 球队数据数组 |
| `data[].id` | string | 球队唯一标识 |
| `data[].teamName` | string | 球队名称 |
| `data[].teamDoctor` | string | 队医 |
| `data[].headCoach` | string | 主教练 |
| `data[].teamLeader` | string | 队长 |
| `data[].coachPhone` | string | 教练联系电话 |
| `data[].leaderPhone` | string | 队长联系电话 |
| `data[].homeJerseyColor` | string | 主场球衣颜色 |
| `data[].awayJerseyColor` | string | 客场球衣颜色 |
| `data[].teamLogo` | string | 球队 Logo URL |
| `data[].homeJersey` | string | 主场球衣图片 URL |
| `data[].awayJersey` | string | 客场球衣图片 URL |
| `data[].createdAt` | string | 创建时间 |
| `data[].updatedAt` | string | 更新时间 |
| `total` | number | 总记录数 |
| `page` | number | 当前页码 |
| `limit` | number | 每页数量 |

**错误响应**:

| 状态码 | 错误信息 | 说明 |
|--------|----------|------|
| 400 | `Validation failed (numeric string is expected)` | page 或 limit 参数传入非整数值 |
| 500 | `Internal server error` | 服务器内部错误 |

---

#### 3.2 按名称搜索球队

- **URL**: `GET /api/v1/teams/search`
- **功能描述**: 根据球队名称进行模糊搜索
- **使用场景**: 球队搜索功能、快速查找特定球队

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `name` | string | 是 | 球队名称（支持模糊匹配） |

**请求头**:

| 头信息 | 值 | 必填 |
|--------|-----|------|
| `Content-Type` | `application/json` | 是 |

**成功响应** (200 OK):

```json
[
  {
    "id": "clx1p3k2m0000qz7j823e7q8y",
    "teamName": "计算机学院",
    "teamDoctor": "张医生",
    "headCoach": "李教练",
    "teamLeader": "王队长",
    "coachPhone": "13800138001",
    "leaderPhone": "13800138002",
    "homeJerseyColor": "红色",
    "awayJerseyColor": "白色",
    "teamLogo": "https://example.com/logo1.png",
    "homeJersey": "https://example.com/jersey_home.png",
    "awayJersey": "https://example.com/jersey_away.png",
    "createdAt": "2024-10-01T08:00:00.000Z",
    "updatedAt": "2024-10-01T08:00:00.000Z"
  }
]
```

**响应字段说明**: 同球队列表接口

**错误响应**:

| 状态码 | 错误信息 | 说明 |
|--------|----------|------|
| 400 | `Name parameter is required` | 缺少必需参数 |
| 500 | `Internal server error` | 服务器内部错误 |

---

#### 3.3 获取单个球队

- **URL**: `GET /api/v1/teams/:id`
- **功能描述**: 根据 ID 获取单个球队的详细信息，包含所属球员
- **使用场景**: 查看球队详情页面、球队阵容展示

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `id` | string | 是 | 球队 ID |

**请求头**:

| 头信息 | 值 | 必填 |
|--------|-----|------|
| `Content-Type` | `application/json` | 是 |

**成功响应** (200 OK):

```json
{
  "id": "clx1p3k2m0000qz7j823e7q8y",
  "teamName": "计算机学院",
  "teamDoctor": "张医生",
  "headCoach": "李教练",
  "teamLeader": "王队长",
  "coachPhone": "13800138001",
  "leaderPhone": "13800138002",
  "homeJerseyColor": "红色",
  "awayJerseyColor": "白色",
  "teamLogo": "https://example.com/logo1.png",
  "homeJersey": "https://example.com/jersey_home.png",
  "awayJersey": "https://example.com/jersey_away.png",
  "players": [
    {
      "id": "clx3p9g2w0000qz7j853e7q9a",
      "name": "张三",
      "studentId": "2021001001",
      "jerseyNumber": "10",
      "photo": "https://example.com/player1.jpg",
      "createdAt": "2024-10-05T08:00:00.000Z",
      "updatedAt": "2024-10-05T08:00:00.000Z"
    }
  ],
  "createdAt": "2024-10-01T08:00:00.000Z",
  "updatedAt": "2024-10-01T08:00:00.000Z"
}
```

**响应字段说明**:

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 球队唯一标识 |
| `teamName` | string | 球队名称 |
| `teamDoctor` | string | 队医 |
| `headCoach` | string | 主教练 |
| `teamLeader` | string | 队长 |
| `coachPhone` | string | 教练联系电话 |
| `leaderPhone` | string | 队长联系电话 |
| `homeJerseyColor` | string | 主场球衣颜色 |
| `awayJerseyColor` | string | 客场球衣颜色 |
| `teamLogo` | string | 球队 Logo URL |
| `homeJersey` | string | 主场球衣图片 URL |
| `awayJersey` | string | 客场球衣图片 URL |
| `players` | array | 球队球员列表 |
| `players[].id` | string | 球员 ID |
| `players[].name` | string | 球员姓名 |
| `players[].studentId` | string | 学号 |
| `players[].jerseyNumber` | string | 球衣号码 |
| `players[].photo` | string | 球员照片 URL |
| `createdAt` | string | 创建时间 |
| `updatedAt` | string | 更新时间 |

**错误响应**:

| 状态码 | 错误信息 | 说明 |
|--------|----------|------|
| 404 | `Team not found` | 球队不存在 |
| 500 | `Internal server error` | 服务器内部错误 |

---

## 错误状态码汇总

| 状态码 | 含义 |
|--------|------|
| 400 | 请求参数错误 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 接口权限说明

| 接口 | 是否需要认证 |
|------|-------------|
| `/api/v1/matches` | 否 |
| `/api/v1/matches/:id` | 否 |
| `/api/v1/players` | 否 |
| `/api/v1/players/search` | 否 |
| `/api/v1/players/:id` | 否 |
| `/api/v1/teams` | 否 |
| `/api/v1/teams/search` | 否 |
| `/api/v1/teams/:id` | 否 |

> **注意**: 所有 GET 请求接口均为公开接口，无需身份认证即可访问。