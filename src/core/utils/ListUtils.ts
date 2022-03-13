export function isNullOrEmpty(lst: any[]) {
   return !isNonEmptyList(lst);
}

export function isNonEmptyList(lst: any[]){
    return  Array.isArray(lst) && lst.length;
}