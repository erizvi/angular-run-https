import { Observable } from "rxjs";

export interface Exitable{
    onExit(): Observable<boolean>;
}