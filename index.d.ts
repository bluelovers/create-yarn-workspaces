export interface IOptions {
    cwd?: string;
    ignoreParentWorkspaces?: boolean;
    ignoreExistsPackage?: boolean;
}
export declare function createYarnWorkspaces(cwd?: string, options?: IOptions): boolean;
export declare function isSamePath(p1: string, p2: string): boolean;
export declare function _createYarnWorkspaces(targetPath: string): boolean;
export declare function createDirByPackages(cwd: string, packages: string[]): boolean;
export default createYarnWorkspaces;
