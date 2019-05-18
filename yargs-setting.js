"use strict";
/**
 * Created by user on 2019/5/16.
 */
Object.defineProperty(exports, "__esModule", { value: true });
function setupWorkspacesInitToYargs(yargs) {
    return yargs
        .default({
    //input: process.cwd(),
    })
        .option('name', {
        alias: ['n'],
        requiresArg: true,
        normalize: true,
        type: 'string',
    })
        .option('ignoreExistsPackage', {
        boolean: true,
        alias: ['i'],
    })
        .option('ignoreParentWorkspaces', {
        boolean: true,
    })
        .option('debug', {
        boolean: true,
    });
}
exports.setupWorkspacesInitToYargs = setupWorkspacesInitToYargs;
exports.default = setupWorkspacesInitToYargs;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoieWFyZ3Mtc2V0dGluZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInlhcmdzLXNldHRpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOztHQUVHOztBQUtILFNBQWdCLDBCQUEwQixDQUFnQixLQUFjO0lBRXZFLE9BQU8sS0FBSztTQUNWLE9BQU8sQ0FBQztJQUNSLHVCQUF1QjtLQUN2QixDQUFDO1NBQ0QsTUFBTSxDQUFDLE1BQU0sRUFBRTtRQUNmLEtBQUssRUFBRSxDQUFDLEdBQUcsQ0FBQztRQUNaLFdBQVcsRUFBRSxJQUFJO1FBQ2pCLFNBQVMsRUFBRSxJQUFJO1FBQ2YsSUFBSSxFQUFFLFFBQVE7S0FDZCxDQUFDO1NBQ0QsTUFBTSxDQUFDLHFCQUFxQixFQUFFO1FBQzlCLE9BQU8sRUFBRSxJQUFJO1FBQ2IsS0FBSyxFQUFFLENBQUMsR0FBRyxDQUFDO0tBQ1osQ0FBQztTQUNELE1BQU0sQ0FBQyx3QkFBd0IsRUFBRTtRQUNqQyxPQUFPLEVBQUUsSUFBSTtLQUNiLENBQUM7U0FDRCxNQUFNLENBQUMsT0FBTyxFQUFFO1FBQ2hCLE9BQU8sRUFBRSxJQUFJO0tBQ2IsQ0FBQyxDQUNGO0FBQ0YsQ0FBQztBQXZCRCxnRUF1QkM7QUFFRCxrQkFBZSwwQkFBMEIsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQ3JlYXRlZCBieSB1c2VyIG9uIDIwMTkvNS8xNi5cbiAqL1xuXG5pbXBvcnQgeWFyZ3MgPSByZXF1aXJlKCd5YXJncycpO1xuaW1wb3J0IHsgQXJndiwgT21pdCB9IGZyb20gJ3lhcmdzJztcblxuZXhwb3J0IGZ1bmN0aW9uIHNldHVwV29ya3NwYWNlc0luaXRUb1lhcmdzPFQgZXh0ZW5kcyBhbnk+KHlhcmdzOiBBcmd2PFQ+KVxue1xuXHRyZXR1cm4geWFyZ3Ncblx0XHQuZGVmYXVsdCh7XG5cdFx0XHQvL2lucHV0OiBwcm9jZXNzLmN3ZCgpLFxuXHRcdH0pXG5cdFx0Lm9wdGlvbignbmFtZScsIHtcblx0XHRcdGFsaWFzOiBbJ24nXSxcblx0XHRcdHJlcXVpcmVzQXJnOiB0cnVlLFxuXHRcdFx0bm9ybWFsaXplOiB0cnVlLFxuXHRcdFx0dHlwZTogJ3N0cmluZycsXG5cdFx0fSlcblx0XHQub3B0aW9uKCdpZ25vcmVFeGlzdHNQYWNrYWdlJywge1xuXHRcdFx0Ym9vbGVhbjogdHJ1ZSxcblx0XHRcdGFsaWFzOiBbJ2knXSxcblx0XHR9KVxuXHRcdC5vcHRpb24oJ2lnbm9yZVBhcmVudFdvcmtzcGFjZXMnLCB7XG5cdFx0XHRib29sZWFuOiB0cnVlLFxuXHRcdH0pXG5cdFx0Lm9wdGlvbignZGVidWcnLCB7XG5cdFx0XHRib29sZWFuOiB0cnVlLFxuXHRcdH0pXG5cdDtcbn1cblxuZXhwb3J0IGRlZmF1bHQgc2V0dXBXb3Jrc3BhY2VzSW5pdFRvWWFyZ3NcbiJdfQ==