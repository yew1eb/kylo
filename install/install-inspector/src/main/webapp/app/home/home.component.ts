import {Component, OnInit} from '@angular/core';

import {Account, ConfigService} from '../shared';
import {Status} from '../shared/config/status.model';
import {FormControl, Validators} from '@angular/forms';

@Component({
    selector: 'jhi-home',
    templateUrl: './home.component.html',
    styleUrls: [
        'home.scss'
    ]
})
export class HomeComponent implements OnInit {
    account: Account;
    checks: Array<any> = []; // todo make a class
    isLoading: boolean;
    selectedCheckId = -1;
    path = new FormControl('', [Validators.required]);
    devMode = new FormControl(false, [Validators.required]);

    constructor(private configService: ConfigService) {
    }

    ngOnInit() {
        const self = this;

        this.loadChecks().toPromise().then((checks) => {
            if (checks) {
                console.log('loaded checks', checks);
                checks.forEach(function(check) {
                    console.log('for each check', check);
                    console.log('this', this);
                    console.log('self', self);
                    check.enabled = new FormControl(false);
                    check.status = new Status('Initial');
                });
                self.checks = checks;
                if (self.checks.length > 0) {
                    self.selectedCheckId = self.checks[0].id;
                }
                self.isLoading = false;
            } else {
                console.log('there are no checks configured on server');
                self.checks = null;
                self.isLoading = false;
            }
            return self.checks;
        }).catch((err) => {
            console.log('error getting configured checks from server');
            self.checks = null;
            self.isLoading = false;
            return null;
        });
    }

    checkConfig() {
        console.log('checkConfig for ' + this.path);
        this.configService.setPath(this.path.value, this.devMode.value).toPromise().then((configuration) => {
            if (configuration) {
                console.log('created new configuration', configuration);
                this.isLoading = false;
            } else {
                console.log('failed to create configuration on path ' + this.path);
                this.isLoading = false;
            }
            return configuration;
        }).then(this.executeChecks)
            .catch((err) => {
                console.log('error creating configuration on path ' + this.path);
                this.isLoading = false;
                return null;
            });
    }

    loadChecks() {
        console.log('loading checks');
        return this.configService.loadChecks();
    }

    executeChecks = (configuration: any) => {
        console.log('execute checks for configuration ' + configuration.path.uri);
        const checks = this.checks
            .filter((check) => check.enabled.value)
            .map((check) => {
            check.status = new Status('Loading');
            return this.configService.executeCheck(configuration.id, check.id).toPromise().then((status) => {
                console.log('check ' + check.id + ' executed with status ' + status, status);
                check.status = status;
                return status;
            }).catch((err) => {
                console.log('error executing check ' + check.id);
                const status = new Status('Failed');
                check.status = status;
                return status;
            });
        });
        return Promise.all(checks)
            .then((res) => {
                res.forEach((status) => {
                    console.log('received stats ', status);
                });
            });
    };

    getErrorMessage() {
        return this.path.hasError('required') ? 'You must enter a value' : '';
    }

    toggleCheckEnabled(check: any) {
        check.enabled.value = !check.enabled.value;
    }

}