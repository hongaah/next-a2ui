import { Project } from "ts-morph";

/** 测试与试验用：把源码放在内存文件系统里，不碰磁盘。 */
export function createInMemoryProject(files: Readonly<Record<string, string>>): Project {
  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: { strict: true, jsx: 4 },
  });
  for (const [path, code] of Object.entries(files)) {
    project.createSourceFile(path, code);
  }
  return project;
}

/** 生产用：按宿主 app 自己的 tsconfig 加载，保证类型解析与它一致。 */
export function createProjectFromTsConfig(tsConfigFilePath: string): Project {
  return new Project({ tsConfigFilePath });
}
