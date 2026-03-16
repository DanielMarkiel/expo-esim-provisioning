import ExpoModulesCore
import CoreTelephony

public class ExpoEsimProvisioningModule: Module {
    public func definition() -> ModuleDefinition {
        Name("ExpoEsimProvisioning")

        Function("getActiveSubscriptionCount") { () -> Int in
            let networkInfo = CTTelephonyNetworkInfo()
            return networkInfo.serviceSubscriberCellularProviders?.count ?? 0
        }
    }
}
