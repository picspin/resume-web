# GitHub Actions 工作流说明

本项目包含三个GitHub Actions工作流文件，用于自动化测试、构建和部署。

## 工作流文件

### 1. `test.yml` - 基础测试和构建
**触发条件：**
- 推送到 `main` 或 `develop` 分支
- 创建Pull Request到 `main` 分支
- 手动触发

**功能：**
- 安装依赖
- 安全漏洞检查
- 代码检查 (linting)
- 项目构建
- 构建产物上传

### 2. `deploy.yml` - 部署到GitHub Pages
**触发条件：**
- 推送到 `main` 分支
- 手动触发

**功能：**
- 构建项目
- 部署到GitHub Pages
- 自动生成预览URL

### 3. `ci-cd.yml` - 完整的CI/CD流水线
**触发条件：**
- 推送到 `main` 或 `develop` 分支
- 创建Pull Request到 `main` 分支
- 手动触发

**功能：**
- 测试和构建
- 预览部署 (Pull Request)
- 生产环境部署到GitHub Pages
- 安全扫描
- 通知

## 设置说明

### 1. 启用GitHub Pages
1. 进入仓库设置 (Settings)
2. 找到 "Pages" 选项
3. 选择 "GitHub Actions" 作为部署源

### 2. 权限设置
确保仓库有适当的权限来运行GitHub Actions：
- 进入仓库设置
- 找到 "Actions" → "General"
- 确保 "Actions permissions" 设置为 "Allow all actions and reusable workflows"

### 3. 环境设置
工作流会自动创建 `github-pages` 环境，无需手动配置。

## 使用建议

### 开发流程
1. 在 `develop` 分支开发新功能
2. 创建Pull Request到 `main` 分支
3. GitHub Actions会自动运行测试
4. 通过后合并到 `main` 分支
5. 自动部署到GitHub Pages

### 手动触发
可以在GitHub仓库的 "Actions" 标签页手动触发任何工作流。

### 部署URL
成功部署后，你的简历网站将可以通过以下URL访问：
- `https://cher2bb.github.io/resume-web/`

## 故障排除

### 常见问题
1. **构建失败**
   - 检查 `npm ci` 是否成功
   - 查看linting错误
   - 确认所有依赖都已安装

2. **部署失败**
   - 检查GitHub Pages设置
   - 确认构建产物路径正确 (`dist/`)
   - 查看权限设置

3. **安全扫描失败**
   - 运行 `npm audit fix` 修复漏洞
   - 更新有安全问题的依赖

4. **工作流不运行**
   - 检查Actions权限设置
   - 确认工作流文件在正确路径
   - 验证YAML语法

### 日志查看
在GitHub仓库的 "Actions" 标签页可以查看详细的工作流日志和错误信息。

### 构建产物
- 构建产物会保存在 `dist/` 目录
- 可以通过Actions页面下载构建产物进行调试 